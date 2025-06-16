import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Jar } from "./layout/Jar";
import { Info, RefreshCw, Loader2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Alert, AlertDescription } from "./ui/alert";
import { useDisplayMode } from "./layout/display-mode-context";

export default function JamLanding() {
  const {
    displayMode,
    toggleDisplayMode,
    formatAmount,
    getLogo,
    jars,
    totalBalance,
    isLoading,
    error,
    refetchWalletData,
  } = useDisplayMode();

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-center mb-8">
        <div className="text-lg opacity-80 text-gray-400">
          {displayMode === "btc" ? "Bitcoin" : "Satoshi"}
        </div>
        <div className="text-4xl font-light tracking-wider mb-2 flex justify-center items-center cursor-pointer select-none min-h-[56px]">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[56px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <span
                onClick={toggleDisplayMode}
                title="Click to toggle sats/bitcoin"
                className="tabular-nums min-w-[250px] text-center">
                {formatAmount(totalBalance)}{" "}
              </span>
              <span className="flex items-center min-h-[48px]">
                {getLogo("lg")}
              </span>
            </>
          )}
        </div>
        <div className="flex gap-4 justify-center mt-10">
          <Button className="px-12 cursor-pointer">↓ Receive</Button>
          <Button className="px-16 cursor-pointer" variant="outline">
            ↑ Send
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4 max-w-2xl">
          <AlertDescription>
            Error loading wallet data: {error.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchWalletData()}
              className="ml-2">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card className="w-full max-w-2xl border-0 shadow-none text-black dark:text-white dark:bg-[#181b20] p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center w-full justify-center">
            <span className="opacity-80 font-light">Wallet distribution</span>
            <div className="text-black opacity-80 mx-3 dark:text-white">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} />
                </TooltipTrigger>
                <TooltipContent>Select a jar to get started</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4">
          {isLoading ? (
            <div className="flex-1 flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : jars.length > 0 ? (
            jars.map((jar) => (
              <Tooltip key={jar.name}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col cursor-pointer hover:scale-105 transition-all duration-300 items-center">
                    <Jar
                      name={jar.name}
                      amount={jar.balance}
                      color={jar.color}
                      displayMode={displayMode}
                      totalBalance={totalBalance}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Open {jar.name} Jar</TooltipContent>
              </Tooltip>
            ))
          ) : (
            <div className="flex-1 text-center py-4 text-gray-500">
              No accounts found in wallet
            </div>
          )}
        </div>
      </Card>
      <div className="flex justify-end w-full max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchWalletData()}
          className="flex gap-2 items-center text-gray-500">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
