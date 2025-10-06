"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BookOpen, Shield } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-0 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl text-primary mb-2">SWORD</CardTitle>
            <CardDescription className="text-muted-foreground">
              Scripture • Wisdom • Order • Reflection • Devotion
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input 
              type="email" 
              placeholder="Enter your email"
              className="border-border/50 bg-input-background/50"
            />
          </div>
          <div className="space-y-2">
            <Input 
              type="password" 
              placeholder="Enter your password"
              className="border-border/50 bg-input-background/50"
            />
          </div>
          <Button 
            onClick={onLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Enter Scripture Study
          </Button>
          <div className="text-center">
            <Button variant="ghost" className="text-sm text-muted-foreground">
              Create Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
