import React, { useState, useEffect } from "react";
import styles from "./Balance.module.css";
import { BTC, SATS, btcToSats, satsToBtc } from "../utils";
import { IoEyeOff } from "react-icons/io5";

const UNIT_MODE_BTC = 0;
const UNIT_MODE_SATS = 1;
const UNIT_MODE_HIDDEN = 2;

const getUnitMode = (unit, showBalance) => {
  if (showBalance && unit === SATS) return UNIT_MODE_SATS;
  if (showBalance && unit === BTC) return UNIT_MODE_BTC;

  return UNIT_MODE_HIDDEN;
};

export default function Balance({ value, unit, showBalance = false }) {
  const [unitMode, setUnitMode] = useState(getUnitMode(unit, showBalance));

  useEffect(() => {
    setUnitMode(getUnitMode(unit, showBalance));
  }, [unit, showBalance]);

  if (unitMode === UNIT_MODE_HIDDEN) {
    return (
      <span className={styles.balance}>
        <span className={styles.text}>*****</span>
        &nbsp;
        <IoEyeOff className={styles.icon} />
      </span>
    );
  }

  const btcFormatter = new Intl.NumberFormat("en-US", {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 8,
  });

  const satFormatter = new Intl.NumberFormat("en-US", {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 0,
  });

  const isSats = value === parseInt(value);
  const isBTC = !isSats && typeof value === "string" && value.indexOf(".") > -1;

  const btcSymbol = <span className={styles["bitcoin-symbol"]}>{"\u20BF"}</span>;
  const satSymbol = <span className={styles["satoshi-symbol"]}>S</span>;

  const balanceJSX = (symbolJSX, formattedValue, isPrefix = true) => {
    return (
      <span className={styles["balance-wrapper"]}>
        {isPrefix ? symbolJSX : ""}
        <span className={styles["balance"]}>{formattedValue}</span>
        {!isPrefix ? symbolJSX : ""}
      </span>
    );
  };

  if (isBTC && unitMode === UNIT_MODE_BTC) return balanceJSX(btcSymbol, btcFormatter.format(value));
  if (isSats && unitMode === UNIT_MODE_SATS) return balanceJSX(satSymbol, satFormatter.format(value), false);

  if (isBTC && unitMode === UNIT_MODE_SATS) return balanceJSX(satSymbol, satFormatter.format(btcToSats(value)), false);
  if (isSats && unitMode === UNIT_MODE_BTC) return balanceJSX(btcSymbol, btcFormatter.format(satsToBtc(value)));

  // Something unexpected happened. Simply render what was passed in the props.
  return (
    <span className={styles.balance}>
      {value} {unit}
    </span>
  );
}
