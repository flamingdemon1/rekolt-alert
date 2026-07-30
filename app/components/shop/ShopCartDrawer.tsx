"use client";

import {
  ArrowRight,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Language } from "../../types";
import {
  calculateCouponDiscount,
  type ShopCartLine,
  type ShopCoupon,
} from "./shop-cart.types";

const FREE_DELIVERY_MINIMUM = 2_500;

const cartCopy = {
  mfe: {
    title: "Ou panie",
    close: "Ferm panie",
    emptyTitle: "Ou panie ankor vid",
    emptyBody: "Azout bann plant ek prodwi ki ou bizin pou ou prosin rekolt.",
    continue: "Kontign aste",
    clear: "Vid panie",
    remove: "Tir prodwi",
    decrease: "Diminie kantite",
    increase: "Ogmant kantite",
    quantity: "Kantite",
    coupon: "Kod promosyon",
    couponPlaceholder: "Antre ou kod",
    apply: "Aplike",
    couponHelp: "Pou demonstrasion: REKOLT10 ouswa MORIS50",
    invalidCoupon: "Sa kod-la pa valid.",
    appliedCoupon: "Kod aplike avek sikse.",
    subtotal: "Sou-total",
    discount: "Rediksion",
    total: "Total prodwi",
    checkout: "Al peyman",
    freeUnlocked: "Livre gratis finn aktive pou sa komann-la.",
    freeRemaining: (amount: number) =>
      `Azout ankor Rs ${amount.toLocaleString("en-MU")} pou gagn livre gratis.`,
    deviceNote:
      "Ou panie reste lor sa laparey-la. Nou pa sov okenn detay peyman.",
  },
  en: {
    title: "Your cart",
    close: "Close cart",
    emptyTitle: "Your cart is still empty",
    emptyBody: "Add the plants and supplies you need for your next harvest.",
    continue: "Continue shopping",
    clear: "Clear cart",
    remove: "Remove item",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    quantity: "Quantity",
    coupon: "Coupon code",
    couponPlaceholder: "Enter your code",
    apply: "Apply",
    couponHelp: "Demo codes: REKOLT10 or MORIS50",
    invalidCoupon: "That coupon code is not valid.",
    appliedCoupon: "Coupon applied successfully.",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Product total",
    checkout: "Proceed to checkout",
    freeUnlocked: "Free delivery is unlocked for this order.",
    freeRemaining: (amount: number) =>
      `Add Rs ${amount.toLocaleString("en-MU")} more for free delivery.`,
    deviceNote:
      "Your cart stays on this device. No payment details are stored.",
  },
} as const;

function resolveCoupon(value: string): ShopCoupon | null {
  const code = value.trim().toLocaleUpperCase("en");
  if (code === "REKOLT10") {
    return { code: "REKOLT10", kind: "percent", value: 10 };
  }
  if (code === "MORIS50") {
    return { code: "MORIS50", kind: "fixed", value: 50 };
  }
  return null;
}

/** 3D cart drawer with quantities, deletion, coupons and an order summary. */
export function ShopCartDrawer({
  language,
  lines,
  onClose,
  onClear,
  onRemove,
  onQuantityChange,
  onCheckout,
}: {
  language: Language;
  lines: ShopCartLine[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (productId: string, optionId: string) => void;
  onQuantityChange: (
    productId: string,
    optionId: string,
    quantity: number,
  ) => void;
  onCheckout: (coupon: ShopCoupon | null) => void;
}) {
  const copy = cartCopy[language];
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<ShopCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<
    "applied" | "invalid" | null
  >(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + line.option.priceMUR * line.quantity,
        0,
      ),
    [lines],
  );
  const discount = calculateCouponDiscount(subtotal, coupon);
  const productTotal = subtotal - discount;
  const remainingForFreeDelivery = Math.max(
    0,
    FREE_DELIVERY_MINIMUM - productTotal,
  );

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextCoupon = resolveCoupon(couponInput);
    setCoupon(nextCoupon);
    setCouponMessage(nextCoupon ? "applied" : "invalid");
  };

  return (
    <div
      className="shop-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="shop-cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-cart-title"
      >
        <header className="shop-cart-header">
          <div>
            <span>
              <ShoppingCart size={17} aria-hidden="true" />
              {String(
                lines.reduce((total, line) => total + line.quantity, 0),
              ).padStart(2, "0")}
            </span>
            <h2 id="shop-cart-title">{copy.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={copy.close}>
            <X size={22} />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="shop-cart-empty">
            <ShoppingCart size={38} aria-hidden="true" />
            <h3>{copy.emptyTitle}</h3>
            <p>{copy.emptyBody}</p>
            <button type="button" onClick={onClose}>
              {copy.continue}
            </button>
          </div>
        ) : (
          <>
            <div className="shop-cart-lines">
              {lines.map(({ product, option, quantity }) => {
                const name =
                  language === "mfe"
                    ? product.kreolName
                    : product.englishName;
                const optionName =
                  language === "mfe" ? option.formMfe : option.form;

                return (
                  <article
                    className="shop-cart-line"
                    key={`${product.id}-${option.id}`}
                  >
                    <Image
                      src={product.image}
                      width={180}
                      height={120}
                      alt=""
                      unoptimized
                    />
                    <div className="shop-cart-line-copy">
                      <span>{product.id}</span>
                      <h3>{name}</h3>
                      <p>{optionName}</p>
                      <strong>
                        Rs{" "}
                        {(option.priceMUR * quantity).toLocaleString("en-MU")}
                      </strong>
                    </div>
                    <div
                      className="shop-cart-quantity"
                      aria-label={copy.quantity}
                    >
                      <button
                        type="button"
                        aria-label={copy.decrease}
                        onClick={() =>
                          onQuantityChange(
                            product.id,
                            option.id,
                            quantity - 1,
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        aria-label={copy.increase}
                        onClick={() =>
                          onQuantityChange(
                            product.id,
                            option.id,
                            quantity + 1,
                          )
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="shop-cart-remove"
                      type="button"
                      aria-label={`${copy.remove}: ${name}`}
                      onClick={() => onRemove(product.id, option.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="shop-free-delivery">
              <PackageCheck size={19} aria-hidden="true" />
              <div>
                <p>
                  {remainingForFreeDelivery === 0
                    ? copy.freeUnlocked
                    : copy.freeRemaining(remainingForFreeDelivery)}
                </p>
                <span>
                  <i
                    style={{
                      width: `${Math.min(
                        100,
                        (productTotal / FREE_DELIVERY_MINIMUM) * 100,
                      )}%`,
                    }}
                  />
                </span>
              </div>
            </div>

            <form className="shop-coupon" onSubmit={applyCoupon}>
              <label htmlFor="shop-coupon-code">
                <TicketPercent size={17} aria-hidden="true" />
                {copy.coupon}
              </label>
              <div>
                <input
                  id="shop-coupon-code"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder={copy.couponPlaceholder}
                  maxLength={20}
                />
                <button type="submit">{copy.apply}</button>
              </div>
              <small>{copy.couponHelp}</small>
              {couponMessage && (
                <p className={couponMessage}>
                  {couponMessage === "applied"
                    ? copy.appliedCoupon
                    : copy.invalidCoupon}
                </p>
              )}
            </form>

            <div className="shop-cart-summary">
              <p>
                <span>{copy.subtotal}</span>
                <strong>Rs {subtotal.toLocaleString("en-MU")}</strong>
              </p>
              {discount > 0 && (
                <p className="discount">
                  <span>
                    {copy.discount} · {coupon?.code}
                  </span>
                  <strong>- Rs {discount.toLocaleString("en-MU")}</strong>
                </p>
              )}
              <p className="total">
                <span>{copy.total}</span>
                <strong>Rs {productTotal.toLocaleString("en-MU")}</strong>
              </p>
            </div>

            <div className="shop-cart-footer">
              <p>{copy.deviceNote}</p>
              <button
                className="shop-clear-cart"
                type="button"
                onClick={onClear}
              >
                <Trash2 size={16} />
                {copy.clear}
              </button>
              <button
                className="shop-checkout-button"
                type="button"
                onClick={() => onCheckout(coupon)}
              >
                {copy.checkout}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
