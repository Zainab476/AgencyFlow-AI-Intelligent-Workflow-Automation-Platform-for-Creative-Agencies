import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import teamRouter from "./team";
import tasksRouter from "./tasks";
import notificationsRouter from "./notifications";
import activityRouter from "./activity";
import uploadsRouter from "./uploads";

const router = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/projects", projectsRouter);
router.use("/projects", teamRouter);   // /projects/:id/members
router.use("/dashboard", dashboardRouter);
router.use("/tasks", tasksRouter);
router.use("/notifications", notificationsRouter);
router.use("/activity", activityRouter);
router.use("/uploads", uploadsRouter);

export default router;
