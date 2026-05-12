import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletRouter from "./wallet";
import gameRouter from "./game";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/wallet", walletRouter);
router.use("/game", gameRouter);

export default router;
