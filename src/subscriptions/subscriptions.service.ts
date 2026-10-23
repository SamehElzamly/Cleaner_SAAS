import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from './entities/subscription.entity.js';
import { SubscriptionStatus } from './enums/subscription-status.enum.js';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity.js';
import { PlansService } from '../plans/plans.service.js';
import { BillingCycle } from '../plans/enums/billing-cycle.enum.js';
import { PlanDocument } from '../plans/entities/plan.entity.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private readonly subModel: Model<SubscriptionDocument>,
    // Used only to keep tenant.planId in sync. Registered directly in
    // SubscriptionsModule instead of importing TenantModule, because
    // TenantModule -> UsersModule -> SubscriptionsModule would otherwise
    // form a circular module dependency.
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly plansService: PlansService,
  ) {}

  async subscribe(tenantId: string, planId: string) {
    const plan = await this.plansService.findOne(planId); // 404 if missing
    if (!plan.isActive) {
      throw new BadRequestException('This plan is no longer available');
    }

    const startsAt = new Date();
    const renewsAt = new Date(startsAt);
    if (plan.billingCycle === BillingCycle.YEARLY) {
      renewsAt.setFullYear(renewsAt.getFullYear() + 1);
    } else {
      renewsAt.setMonth(renewsAt.getMonth() + 1);
    }

    try {
      // NOTE: no payment is taken here yet — Payments & Invoicing is
      // Phase 5. Until then subscribing activates immediately.
      const created = await new this.subModel({ tenantId, planId, startsAt, renewsAt }).save();
      await this.tenantModel.updateOne({ _id: tenantId }, { $set: { planId } }).exec();
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'This tenant already has an active subscription — cancel it before subscribing to another plan',
        );
      }
      throw err;
    }
  }

  async getCurrent(tenantId: string) {
    const sub = await this.subModel
      .findOne({ tenantId, status: SubscriptionStatus.ACTIVE })
      .populate('planId')
      .exec();
    if (!sub) throw new NotFoundException('This tenant has no active subscription');
    return sub;
  }

  async cancel(tenantId: string, id: string) {
    const sub = await this.subModel
      .findOneAndUpdate(
        { _id: id, tenantId, status: SubscriptionStatus.ACTIVE },
        { $set: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() } },
        { new: true },
      )
      .exec();
    // Same 404 whether it doesn't exist, belongs to another tenant, or is
    // already canceled — never reveals other tenants' subscription ids.
    if (!sub) throw new NotFoundException(`Active subscription "${id}" not found`);

    await this.tenantModel.updateOne({ _id: tenantId }, { $set: { planId: null } }).exec();
    return sub;
  }

  // Used by UsersService to enforce plan limits. Returns null when the
  // tenant has no active subscription.
  async getActivePlan(tenantId: string): Promise<PlanDocument | null> {
    const sub = await this.subModel
      .findOne({ tenantId, status: SubscriptionStatus.ACTIVE })
      .exec();
    if (!sub) return null;
    return this.plansService.findOne(sub.planId.toString());
  }
}
