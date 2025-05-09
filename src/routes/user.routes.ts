import { Router } from "express";

export class UserRoutes {

  static routes(): Router {
    const router = Router();
    router.get('/users', (req, res) => {
      res.send('Get all users');
    });
    router.get('/users/:id', (req, res) => {
      const { id } = req.params;
      res.send(`Get user with id ${id}`);
    })
    router.post('/users', (req, res) => {
      const { name, email } = req.body;
      res.send(`Create user with name ${name} and email ${email}`);
    });
    router.put('/users/:id', (req, res) => {
      const { id } = req.params;
      const { name, email } = req.body;
      res.send(`Update user with id ${id} to name ${name} and email ${email}`);
    });
    router.delete('/users/:id', (req, res) => {
      const { id } = req.params;
      res.send(`Delete user with id ${id}`);
    });

    return router;
  }
}