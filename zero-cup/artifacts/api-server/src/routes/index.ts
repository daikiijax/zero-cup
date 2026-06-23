import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { inferenceRouter } from "./inference";
import { providersRouter } from "./providers";
import { activityRouter } from "./activity";
import { statsRouter } from "./stats";
import { walletRouter } from "./wallet";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/inference", inferenceRouter);
router.use("/providers", providersRouter);
router.use("/activity", activityRouter);
router.use("/stats", statsRouter);
router.use("/wallet", walletRouter);

export default router;
