import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Network, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Network className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold glow-text text-primary">NetForge</h1>
          </div>
          {sent ? (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-muted-foreground text-sm">We've sent a password reset link to {email}</p>
              <Link to="/login"><Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to login</Button></Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-1 text-center">Reset Password</h2>
              <p className="text-muted-foreground text-sm mb-6 text-center">Enter your email to receive a reset link</p>
              <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="bg-muted/50 border-border" required />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">Send Reset Link</Button>
              </form>
              <p className="mt-4 text-center"><Link to="/login" className="text-sm text-primary hover:underline"><ArrowLeft className="inline mr-1 h-3 w-3" />Back to login</Link></p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
