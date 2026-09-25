import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

const policySchema = z.object({
  policyNumber: z.string().min(1),
  type: z.string().min(1),
  premium: z.number().positive(),
  coverage: z.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
  customerId: z.string().uuid(),
});

// Create a policy — Admin/Agent only
router.post("/", authenticate, authorize("ADMIN", "AGENT"), async (req: AuthRequest, res: Response) => {
  const parsed = policySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const data = parsed.data;

  try {
    const policy = await prisma.policy.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        agentId: req.user?.role === "AGENT" ? req.user.userId : undefined,
      },
    });
    res.status(201).json(policy);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A policy with this policy number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create policy" });
  }
});

// List policies — Customers see only their own; Admin/Agent see all
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { status, search, page = "1", limit = "10" } = req.query;

  const where: any = {};

  if (req.user?.role === "CUSTOMER") {
    where.customerId = req.user.userId;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { policyNumber: { contains: String(search), mode: "insensitive" } },
      { type: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.policy.count({ where }),
  ]);

  res.json({ policies, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// Get single policy
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });

  if (!policy) {
    return res.status(404).json({ error: "Policy not found" });
  }

  if (req.user?.role === "CUSTOMER" && policy.customerId !== req.user.userId) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json(policy);
});

// Update policy status (renew/cancel) — Admin/Agent only
router.patch("/:id/status", authenticate, authorize("ADMIN", "AGENT"), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;

  if (!["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const policy = await prisma.policy.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(policy);
});

// Delete policy — Admin only
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  await prisma.policy.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Assign an agent to a policy — Admin only
router.patch("/:id/assign-agent", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const { agentId } = req.body;

  if (agentId) {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== "AGENT") {
      return res.status(400).json({ error: "Invalid agent ID" });
    }
  }

  try {
    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: { agentId: agentId || null },
    });
    res.json(policy);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to assign agent" });
  }
});

const policyUpdateSchema = z.object({
  type: z.string().min(1).optional(),
  premium: z.number().positive().optional(),
  coverage: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Full edit of policy details — Admin/Agent only
router.put("/:id", authenticate, authorize("ADMIN", "AGENT"), async (req: AuthRequest, res: Response) => {
  const parsed = policyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const data = parsed.data;
  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  try {
    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(policy);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.status(500).json({ error: "Failed to update policy" });
  }
});

export default router;