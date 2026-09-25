import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { sendClaimStatusEmail } from "../lib/mailer";

const router = Router();

const claimSchema = z.object({
  policyId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.number().positive(),
});

// Submit a claim — any authenticated user (should own the policy, checked below)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { policyId, description, amount } = parsed.data;

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    return res.status(404).json({ error: "Policy not found" });
  }

  if (req.user?.role === "CUSTOMER" && policy.customerId !== req.user.userId) {
    return res.status(403).json({ error: "You can only file claims on your own policies" });
  }

  const claimNumber = `CLM-${Date.now()}`;

  const claim = await prisma.claim.create({
    data: { claimNumber, policyId, description, amount },
  });

  res.status(201).json(claim);
});

// List claims — Customers see only claims on their own policies; Admin/Agent see all
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { status, search, page = "1", limit = "10" } = req.query;

  const where: any = {};
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { claimNumber: { contains: String(search), mode: "insensitive" } },
      { description: { contains: String(search), mode: "insensitive" } },
    ];
  }

  if (req.user?.role === "CUSTOMER") {
    where.policy = { customerId: req.user.userId };
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: { policy: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.claim.count({ where }),
  ]);

  res.json({ claims, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// Approve/reject a claim — Admin/Agent only
router.patch("/:id/status", authenticate, authorize("ADMIN", "AGENT"), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;

  if (!["APPROVED", "REJECTED", "UNDER_REVIEW"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const claim = await prisma.claim.update({
    where: { id: req.params.id },
    data: { status, reviewedAt: new Date() },
    include: { policy: { include: { customer: true } } },
  });

  sendClaimStatusEmail(claim.policy.customer.email, claim.claimNumber, status);

  res.json(claim);
});

export default router;