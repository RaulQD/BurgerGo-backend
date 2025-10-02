import { Request, Response } from 'express';
import { CreateEmployeeDTO } from '../dtos';
import { catchError } from '../../../utils';
import { CREATED } from '../../../constants/http';
import { EmployeeService } from '../services/employee.service';

export class EmployeeController {
  private employeeService: EmployeeService;
  constructor() {
    this.employeeService = new EmployeeService();
  }

  public createEmployee = catchError(
    async (req: Request<{}, {}, CreateEmployeeDTO>, res: Response) => {
      const employeeData = req.body;
      const data = await this.employeeService.createEmployee(employeeData);
      return res
        .status(CREATED)
        .json({ message: 'Empleado creado exitosamente', employeeId: data.id });
    },
  );
}
