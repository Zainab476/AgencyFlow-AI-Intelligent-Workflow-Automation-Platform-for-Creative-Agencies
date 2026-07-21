import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";

const router = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/projects", projectsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
