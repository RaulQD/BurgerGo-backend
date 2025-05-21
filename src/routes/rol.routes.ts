import { Router } from "express";
import { RolController } from "../controllers/rol.controller";
import { CreateRolDto } from "../dtos/roles/rol.dto";
import { validateMiddlewareDTO } from "../middlewares/validation-dto";


const router = Router();
const rolController = new RolController();

router.post("/", validateMiddlewareDTO(CreateRolDto), rolController.createRol);
router.get("/", rolController.getAllRoles);
router.get("/:id", rolController.getRolById);
export default router;
