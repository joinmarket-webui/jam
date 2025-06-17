import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createWallet, getJmSession } from "@/lib/JmWalletApi";
import { setSession, clearSession } from "@/lib/session";
import { formatWalletName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wallet, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const CreateWallet = () => {
  const navigate = useNavigate();
  const [walletName, setWalletName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [step, setStep] = useState<"create" | "seed" | "confirm">("create");

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!walletName.trim()) {
      toast.error("Wallet name is required");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      // Clear any existing local session
      clearSession();

      // Check if there's an active session on the server
      try {
        const sessionInfo = await getJmSession();
        if (sessionInfo.session || sessionInfo.wallet_name !== "None") {
          console.warn("Active session detected:", sessionInfo);
          toast.error(
            `Cannot create wallet as "${formatWalletName(
              sessionInfo.wallet_name
            )}" wallet is currently active.`,
            {
              description: (
                <div className="text-black dark:text-white">
                  Alternatively, you can{" "}
                  <Link
                    to="/login"
                    className="underline hover:no-underline font-medium">
                    log in with the existing wallet
                  </Link>{" "}
                  instead.
                </div>
              ),
              duration: 8000,
            }
          );
          return;
        }
      } catch (sessionError) {
        console.warn("Could not check session status:", sessionError);
        // Continue anyway, wallet creation might still work
      }

      const walletFileName = walletName.endsWith(".jmdat")
        ? walletName
        : `${walletName}.jmdat`;
      const response = await createWallet(walletFileName, password);

      setSeedPhrase(response.seedphrase);
      setStep("seed");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create wallet";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSeed = () => {
    if (seedPhrase) {
      // Save session and navigate to dashboard
      const walletFileName = walletName.endsWith(".jmdat")
        ? walletName
        : `${walletName}.jmdat`;
      setSession({
        walletFileName,
        auth: { token: "created" }, // We'll need to unlock it properly later
      });

      navigate("/login", {
        state: {
          message:
            "Wallet created successfully! Please log in with your credentials.",
          walletName: walletFileName,
        },
      });
    }
  };

  const renderCreateForm = () => (
    <form onSubmit={handleCreateWallet} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wallet-name">Wallet Name</Label>
        <Input
          id="wallet-name"
          type="text"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          disabled={isLoading}
          placeholder="Enter wallet name"
          required
        />
        <p className="text-xs text-muted-foreground">
          Will be saved as {walletName || "wallet-name"}.jmdat
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Enter password"
            className="pl-10 pr-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            onClick={() => {
              setShowConfirmPassword(false);
              setShowPassword(!showPassword);
            }}>
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Confirm password"
            className="pl-10 pr-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            onClick={() => {
              setShowPassword(false);
              setShowConfirmPassword(!showConfirmPassword);
            }}>
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Wallet...
          </>
        ) : (
          "Create Wallet"
        )}
      </Button>
    </form>
  );

  const renderSeedPhrase = () => (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-2 text-sm font-mono">
          {seedPhrase?.split(" ").map((word, index) => (
            <div key={index} className="bg-background p-2 rounded border">
              <span className="text-muted-foreground mr-2">{index + 1}.</span>
              {word}
            </div>
          ))}
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Write down this seed phrase and store it
          safely. It's the only way to recover your wallet if you lose access.
        </AlertDescription>
      </Alert>

      <Button onClick={handleConfirmSeed} className="w-full" size="lg">
        I have saved my seed phrase
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === "create" && "Create New Wallet"}
              {step === "seed" && "Save Your Seed Phrase"}
            </CardTitle>
            <CardDescription>
              {step === "create" &&
                "Set up a new Joinmarket wallet for CoinJoin privacy"}
              {step === "seed" && "This is your wallet's recovery phrase"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === "create" && renderCreateForm()}
            {step === "seed" && renderSeedPhrase()}

            {step === "create" && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have a wallet?{" "}
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/80 font-medium underline underline-offset-4">
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateWallet;
