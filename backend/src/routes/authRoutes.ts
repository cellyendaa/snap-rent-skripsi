import { Router, Request, Response } from 'express';
import { findUserByCredentials, isPhoneRegistered, addUserToSheet } from '../services/sheetService.js';
import type {
  LoginRequestBody,
  LoginSuccessResponse,
  LoginErrorResponse,
  RegisterRequestBody,
  RegisterSuccessResponse,
  RegisterErrorResponse,
} from '../types.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body as Partial<LoginRequestBody>;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !password || typeof password !== 'string') {
      const body: LoginErrorResponse = {
        success: false,
        message: 'phoneNumber and password are required',
      };
      res.status(400).json(body);
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      const body: LoginErrorResponse = {
        success: false,
        message: 'phoneNumber and password cannot be empty',
      };
      res.status(400).json(body);
      return;
    }

    const user = await findUserByCredentials(trimmedPhone, trimmedPassword);

    if (!user) {
      const body: LoginErrorResponse = {
        success: false,
        message: 'Invalid phone number or password',
      };
      res.status(401).json(body);
      return;
    }

    const body: LoginSuccessResponse = {
      success: true,
      message: 'Login successful',
      user: {
        name: user.name,
        phoneNumber: user.phone_number,
      },
    };
    res.status(200).json(body);
  } catch (err) {
    console.error('Login error:', err);
    const body: LoginErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
    res.status(500).json(body);
  }
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password, name } = req.body as Partial<RegisterRequestBody>;

    if (
      !phoneNumber ||
      typeof phoneNumber !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      !name ||
      typeof name !== 'string'
    ) {
      const body: RegisterErrorResponse = {
        success: false,
        message: 'phoneNumber, password, and name are required',
      };
      res.status(400).json(body);
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (!trimmedPhone || !trimmedPassword || !trimmedName) {
      const body: RegisterErrorResponse = {
        success: false,
        message: 'phoneNumber, password, and name cannot be empty',
      };
      res.status(400).json(body);
      return;
    }

    if (trimmedPassword.length < 6) {
      const body: RegisterErrorResponse = {
        success: false,
        message: 'Password must be at least 6 characters',
      };
      res.status(400).json(body);
      return;
    }

    const exists = await isPhoneRegistered(trimmedPhone);
    if (exists) {
      const body: RegisterErrorResponse = {
        success: false,
        message: 'Nomor telepon sudah terdaftar',
      };
      res.status(409).json(body);
      return;
    }

    await addUserToSheet(trimmedPhone, trimmedPassword, trimmedName);

    const body: RegisterSuccessResponse = {
      success: true,
      message: 'Registrasi berhasil',
      user: {
        name: trimmedName,
        phoneNumber: trimmedPhone,
      },
    };
    res.status(201).json(body);
  } catch (err) {
    console.error('Register error:', err);
    const body: RegisterErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
    res.status(500).json(body);
  }
});

export default router;
