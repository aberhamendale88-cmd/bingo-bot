import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletRouter from "./wallet";
import gameRouter from "./game";
import telegramRouter from "./telegram";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/wallet", walletRouter);
router.use("/game", gameRouter);
router.use("/telegram", telegramRouter);
router.use("/admin", adminRouter);

export default router;
