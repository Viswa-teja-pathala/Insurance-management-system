import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// List users, optionally filtered by role — Admin and Agent only
router.get("/", authenticate, authorize("ADMIN", "AGENT"), async (req: AuthRequest, res: Response) => {
  const { role } = req.query;

  const where: any = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  res.json(users);
});

export default router;