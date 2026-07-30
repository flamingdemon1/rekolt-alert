"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ShopCartItem = {
  productId: string;
  optionId: string;
  quantity: number;
};

const MAX_ITEM_QUANTITY = 25;

/** Rejects malformed or excessive values before restoring a device-local cart. */
function readStoredCart(value: string | null): ShopCartItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("productId" in item) ||
        !("optionId" in item) ||
        !("quantity" in item) ||
        typeof item.productId !== "string" ||
        typeof item.optionId !== "string" ||
        typeof item.quantity !== "number"
      ) {
        return [];
      }

      return [
        {
          productId: item.productId,
          optionId: item.optionId,
          quantity: Math.max(
            1,
            Math.min(MAX_ITEM_QUANTITY, Math.floor(item.quantity)),
          ),
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Keeps the demo cart on this device and separates it by signed-in username.
 * Payment and delivery form details are deliberately never stored here.
 */
export function useShopCart(username: string) {
  const storageKey = `rekolt-shop-cart:${username.toLocaleLowerCase("en")}`;
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restored = readStoredCart(window.localStorage.getItem(storageKey));
    queueMicrotask(() => {
      setItems(restored);
      setReady(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, ready, storageKey]);

  const addItem = useCallback((productId: string, optionId: string) => {
    setItems((current) => {
      const existing = current.find(
        (item) =>
          item.productId === productId && item.optionId === optionId,
      );

      if (existing) {
        return current.map((item) =>
          item === existing
            ? {
                ...item,
                quantity: Math.min(
                  MAX_ITEM_QUANTITY,
                  item.quantity + 1,
                ),
              }
            : item,
        );
      }

      return [...current, { productId, optionId, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, optionId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((current) =>
          current.filter(
            (item) =>
              item.productId !== productId || item.optionId !== optionId,
          ),
        );
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.productId === productId && item.optionId === optionId
            ? {
                ...item,
                quantity: Math.min(
                  MAX_ITEM_QUANTITY,
                  Math.floor(quantity),
                ),
              }
            : item,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: string, optionId: string) => {
    setItems((current) =>
      current.filter(
        (item) =>
          item.productId !== productId || item.optionId !== optionId,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  return {
    items,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
