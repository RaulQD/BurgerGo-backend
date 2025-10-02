import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";


export class EmployeeRoutes{

  static get routes(): Router { 
    const router = Router();
    const employeeController = new EmployeeController();
    
    router.post('/create', employeeController.createEmployee);
    
    return router;
  }
}