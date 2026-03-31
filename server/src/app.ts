import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { authRouter } from "./modules/auth/routes";
import { profilesRouter } from "./modules/profiles/routes";
import { universitiesRouter } from "./modules/universities/routes";
import { departmentsRouter } from "./modules/departments/routes";
import { classesRouter } from "./modules/classes/routes";
import { rolesRouter } from "./modules/roles/routes";
import { classRepRequestsRouter } from "./modules/class-rep-requests/routes";
import { tasksRouter } from "./modules/tasks/routes";
import { submissionsRouter } from "./modules/submissions/routes";
import { attendanceRouter } from "./modules/attendance/routes";
import { announcementsRouter } from "./modules/announcements/routes";
import { gamificationRouter } from "./modules/gamification/routes";
import { notificationsRouter } from "./modules/notifications/routes";
import { healthRouter } from "./modules/health/routes";
import { errorHandler } from "./middleware/error-handler";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        };
      },
    },
  }),
);

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", profilesRouter);
app.use("/api", rolesRouter);
app.use("/api", universitiesRouter);
app.use("/api", departmentsRouter);
app.use("/api", classesRouter);
app.use("/api", classRepRequestsRouter);
app.use("/api", tasksRouter);
app.use("/api", submissionsRouter);
app.use("/api", attendanceRouter);
app.use("/api", announcementsRouter);
app.use("/api", gamificationRouter);
app.use("/api", notificationsRouter);

app.use(errorHandler);
