import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/stats", authenticate, async (req: AuthRequest, res: Response) => {
  const isCustomer = req.user?.role === "CUSTOMER";
  const policyWhere = isCustomer ? { customerId: req.user!.userId } : {};
  const claimWhere = isCustomer ? { policy: { customerId: req.user!.userId } } : {};

  const [
    totalPolicies,
    activePolicies,
    pendingPolicies,
    cancelledPolicies,
    expiredPolicies,
    totalClaims,
    submittedClaims,
    approvedClaims,
    rejectedClaims,
    underReviewClaims,
    premiumSum,
    claimAmountSum,
  ] = await Promise.all([
    prisma.policy.count({ where: policyWhere }),
    prisma.policy.count({ where: { ...policyWhere, status: "ACTIVE" } }),
    prisma.policy.count({ where: { ...policyWhere, status: "PENDING" } }),
    prisma.policy.count({ where: { ...policyWhere, status: "CANCELLED" } }),
    prisma.policy.count({ where: { ...policyWhere, status: "EXPIRED" } }),
    prisma.claim.count({ where: claimWhere }),
    prisma.claim.count({ where: { ...claimWhere, status: "SUBMITTED" } }),
    prisma.claim.count({ where: { ...claimWhere, status: "APPROVED" } }),
    prisma.claim.count({ where: { ...claimWhere, status: "REJECTED" } }),
    prisma.claim.count({ where: { ...claimWhere, status: "UNDER_REVIEW" } }),
    prisma.policy.aggregate({ where: policyWhere, _sum: { premium: true } }),
    prisma.claim.aggregate({
      where: { ...claimWhere, status: "APPROVED" },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    policies: {
      total: totalPolicies,
      active: activePolicies,
      pending: pendingPolicies,
      cancelled: cancelledPolicies,
      expired: expiredPolicies,
      totalPremium: premiumSum._sum.premium ?? 0,
    },
    claims: {
      total: totalClaims,
      submitted: submittedClaims,
      approved: approvedClaims,
      rejected: rejectedClaims,
      underReview: underReviewClaims,
      totalApprovedAmount: claimAmountSum._sum.amount ?? 0,
    },
  });
});

export default router;