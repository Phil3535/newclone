import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import authService from '../services/authService';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.register(email, password, fullName);

    if (result.success) {
      toast({
        title: 'Welcome to Empire Streams!',
        description: 'Account created successfully. You have 7 days free trial.',
      });
      navigate('/app');
    } else {
      toast({
        title: 'Registration Failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm border-cyan-500/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-cyan-400">Empire</span>
            <span className="text-pink-400"> Streams</span>
          </h1>
          <p className="text-yellow-400 text-sm">Stay Tuned</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">Full Name</label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
              Login
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-yellow-400 text-xs">🎉 7 Days Free Trial</p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;