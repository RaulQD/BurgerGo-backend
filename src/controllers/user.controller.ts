import { Request, Response } from 'express';


export class UserController {
  // Add your methods and properties here
  constructor() {
    // Initialization code
  }

  // Example method
  getAllUser = async (req: Request, res: Response) => {
    // Logic to get a user
    res.send("Get all users");
  }
  // Example method
  getUserById = async (req: Request, res: Response) => { 
    // Logic to get a user by ID
  }
  // Example method
  public createUser = async (req: Request, res: Response) => {
    const { name, email } = req.body;
    // Logic to create a user
    console.log(`User created: ${name}, Email: ${UserController.name} - createUser`);
    return res.status(201).json({ message: `user create ${name} with email ${email} ` });
  }
  // Example method
  updateUser = async(req: Request, res: Response) => {
    // Logic to update a user
  }
  // Example method
  deleteUser = async(req: Request, res: Response) => {
    // Logic to delete a user
  }

}