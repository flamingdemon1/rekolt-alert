"use client";

import {
  ArrowLeft,
  Banknote,
  Check,
  CircleCheck,
  LockKeyhole,
  MapPin,
  Package,
  Store,
  Truck,
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

type DeliveryMethod = "post" | "home" | "pickup";
type PaymentMethod = "card" | "juice" | "cash";

const FREE_DELIVERY_MINIMUM = 2_500;
const DELIVERY_FEES: Record<DeliveryMethod, number> = {
  post: 120,
  home: 180,
  pickup: 0,
};

const checkoutCopy = {
  mfe: {
    eyebrow: "Peyman demonstrasion",
    title: "Finaliz ou komann",
    close: "Ferm peyman",
    back: "Retour dan panie",
    deliveryTitle: "1. Swazir livre",
    delivery: {
      post: {
        title: "Par lapos",
        body: "Livre estimasion trwa a sink zour travay.",
        fee: "Rs 120",
      },
      home: {
        title: "Livre lakaz",
        body: "Livre estimasion enn a de zour dan Moris.",
        fee: "Rs 180",
      },
      pickup: {
        title: "Vinn pran",
        body: "Rezerv ou komann ek pey kan ou vinn pran li.",
        fee: "Gratis",
      },
    },
    detailsTitle: "2. Detay pou resevwar",
    fullName: "Nom konple",
    phone: "Nimero telefonn",
    email: "Imel",
    address: "Ladres konple",
    district: "Distrik",
    districtPlaceholder: "Swazir enn distrik",
    pickupPoint: "Pwin ramasaz",
    paymentTitle: "3. Swazir peyman",
    payment: {
      card: {
        title: "Mastercard",
        body: "Antre zis bann detay demonstrasion.",
      },
      juice: {
        title: "Juice",
        body: "Simil enn peyman Juice lor ou telefonn.",
      },
      cash: {
        title: "Pey kan livre",
        pickupTitle: "Pey kan ou vinn pran",
        body: "Pey an kas kan ou resevwar ou komann.",
        pickupBody: "Pey an kas kot pwin ramasaz.",
      },
    },
    pickupRestriction:
      "Pou ramasaz, kart ek Juice pa disponib. Pey an kas kan ou vinn pran komann-la.",
    demoWarning:
      "Sa peyman-la zis enn demonstrasion. Pa antre okenn vre nimero kart ouswa vre kod sekirite. Bann detay-la pa transmet ek pa sov.",
    cardName: "Nom demonstrasion lor kart",
    cardNumber: "Nimero kart demonstrasion",
    expiry: "Dat expirasion",
    securityCode: "Kod sekirite",
    juiceNumber: "Nimero Juice demonstrasion",
    juiceReference: "Referans demonstrasion",
    cashNote:
      "Pena okenn peyman an-lign. Prepar montan exak kan ou resevwar komann-la.",
    summaryTitle: "Rezime komann",
    items: "Prodwi",
    discount: "Rediksion",
    deliveryFee: "Fre livre",
    free: "Gratis",
    total: "Total",
    submit: "Konfirm komann demonstrasion",
    secureNote: "Form-la reste dan ou navigater ek efase apre konfirmasion.",
    successEyebrow: "Komann finn anrezistre",
    successTitle: "Mersi pou ou komann!",
    successBody:
      "Sa se enn konfirmasion demonstrasion; okenn larzan pa finn tire.",
    orderNumber: "Nimero komann",
    returnShop: "Retour dan magazin",
  },
  en: {
    eyebrow: "Demo checkout",
    title: "Complete your order",
    close: "Close checkout",
    back: "Back to cart",
    deliveryTitle: "1. Choose delivery",
    delivery: {
      post: {
        title: "By post",
        body: "Estimated delivery in three to five working days.",
        fee: "Rs 120",
      },
      home: {
        title: "Home delivery",
        body: "Estimated delivery in one to two days in Mauritius.",
        fee: "Rs 180",
      },
      pickup: {
        title: "Pick up",
        body: "Reserve your order and pay when you collect it.",
        fee: "Free",
      },
    },
    detailsTitle: "2. Delivery details",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email",
    address: "Full address",
    district: "District",
    districtPlaceholder: "Choose a district",
    pickupPoint: "Pickup point",
    paymentTitle: "3. Choose payment",
    payment: {
      card: {
        title: "Mastercard",
        body: "Enter demonstration details only.",
      },
      juice: {
        title: "Juice",
        body: "Simulate a Juice mobile payment.",
      },
      cash: {
        title: "Payment on delivery",
        pickupTitle: "Payment on pickup",
        body: "Pay cash when your order is delivered.",
        pickupBody: "Pay cash at your selected pickup point.",
      },
    },
    pickupRestriction:
      "Card and Juice are unavailable for pickup. Pay cash when collecting your order.",
    demoWarning:
      "This checkout is only a demonstration. Do not enter a real card number or security code. Details are neither transmitted nor stored.",
    cardName: "Demo name on card",
    cardNumber: "Demo card number",
    expiry: "Expiry date",
    securityCode: "Security code",
    juiceNumber: "Demo Juice number",
    juiceReference: "Demo reference",
    cashNote:
      "No online payment is made. Have the correct amount ready when receiving your order.",
    summaryTitle: "Order summary",
    items: "Products",
    discount: "Discount",
    deliveryFee: "Delivery fee",
    free: "Free",
    total: "Total",
    submit: "Confirm demo order",
    secureNote:
      "This form stays in your browser and is cleared after confirmation.",
    successEyebrow: "Order recorded",
    successTitle: "Thank you for your order!",
    successBody:
      "This is a demonstration confirmation; no money has been charged.",
    orderNumber: "Order number",
    returnShop: "Return to shop",
  },
} as const;

const districts = [
  ["Black River", "Rivier Nwar"],
  ["Flacq", "Flak"],
  ["Grand Port", "Grand Port"],
  ["Moka", "Moka"],
  ["Pamplemousses", "Pamplemousses"],
  ["Plaines Wilhems", "Plenn Wilhem"],
  ["Port Louis", "Port Louis"],
  ["Rivière du Rempart", "Rivier di Ranpar"],
  ["Savanne", "Savann"],
] as const;

const pickupPoints = [
  ["Réduit agricultural hub", "Sant agrikol Reduit"],
  ["Flacq collection point", "Pwin ramasaz Flak"],
  ["Rose Belle collection point", "Pwin ramasaz Roz Bel"],
] as const;

type Confirmation = {
  id: string;
  total: number;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
};

/** Multi-option demo checkout; sensitive-looking fields never leave the page. */
export function ShopCheckout({
  language,
  lines,
  coupon,
  onBack,
  onClose,
  onComplete,
}: {
  language: Language;
  lines: ShopCartLine[];
  coupon: ShopCoupon | null;
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
}) {
  const copy = checkoutCopy[language];
  const [delivery, setDelivery] = useState<DeliveryMethod>("home");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

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
  const productsTotal = subtotal - discount;
  const deliveryFee =
    delivery === "pickup" || productsTotal >= FREE_DELIVERY_MINIMUM
      ? 0
      : DELIVERY_FEES[delivery];
  const total = productsTotal + deliveryFee;

  const chooseDelivery = (method: DeliveryMethod) => {
    setDelivery(method);
    if (method === "pickup" && payment !== "cash") {
      setPayment("cash");
    }
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextConfirmation = {
      id: `RA-${Date.now().toString(36).slice(-7).toLocaleUpperCase("en")}`,
      total,
      delivery,
      payment,
    };

    // Reset the form immediately so demo card or phone values do not linger.
    event.currentTarget.reset();
    setConfirmation(nextConfirmation);
    onComplete();
  };

  if (confirmation) {
    return (
      <div className="shop-overlay shop-checkout-overlay">
        <section
          className="shop-order-success"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-order-success-title"
        >
          <div className="shop-success-icon">
            <CircleCheck size={42} aria-hidden="true" />
          </div>
          <span>{copy.successEyebrow}</span>
          <h2 id="shop-order-success-title">{copy.successTitle}</h2>
          <p>{copy.successBody}</p>
          <dl>
            <div>
              <dt>{copy.orderNumber}</dt>
              <dd>{confirmation.id}</dd>
            </div>
            <div>
              <dt>{copy.total}</dt>
              <dd>Rs {confirmation.total.toLocaleString("en-MU")}</dd>
            </div>
          </dl>
          <button type="button" onClick={onClose}>
            {copy.returnShop}
            <Check size={18} />
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="shop-overlay shop-checkout-overlay">
      <section
        className="shop-checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-checkout-title"
      >
        <header className="shop-checkout-header">
          <button type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            {copy.back}
          </button>
          <div>
            <span>{copy.eyebrow}</span>
            <h2 id="shop-checkout-title">{copy.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={copy.close}>
            <X size={22} />
          </button>
        </header>

        <form className="shop-checkout-form" onSubmit={submitOrder}>
          <div className="shop-checkout-fields">
            <fieldset>
              <legend>{copy.deliveryTitle}</legend>
              <div className="shop-choice-grid delivery">
                {(["post", "home", "pickup"] as const).map((method) => {
                  const Icon =
                    method === "post"
                      ? Package
                      : method === "home"
                        ? Truck
                        : Store;
                  return (
                    <label key={method}>
                      <input
                        type="radio"
                        name="delivery"
                        checked={delivery === method}
                        onChange={() => chooseDelivery(method)}
                      />
                      <span>
                        <Icon size={21} aria-hidden="true" />
                        <strong>{copy.delivery[method].title}</strong>
                        <small>{copy.delivery[method].body}</small>
                        <b>{copy.delivery[method].fee}</b>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend>{copy.detailsTitle}</legend>
              <div className="shop-customer-grid">
                <label>
                  <span>{copy.fullName}</span>
                  <input name="fullName" type="text" required maxLength={80} />
                </label>
                <label>
                  <span>{copy.phone}</span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    maxLength={20}
                  />
                </label>
                <label className="wide">
                  <span>{copy.email}</span>
                  <input name="email" type="email" required maxLength={120} />
                </label>

                {delivery === "pickup" ? (
                  <label className="wide">
                    <span>{copy.pickupPoint}</span>
                    <select name="pickupPoint" required defaultValue="">
                      <option value="" disabled>
                        {copy.pickupPoint}
                      </option>
                      {pickupPoints.map(([en, mfe]) => (
                        <option value={en} key={en}>
                          {language === "mfe" ? mfe : en}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="wide">
                      <span>{copy.address}</span>
                      <textarea
                        name="address"
                        required
                        rows={3}
                        maxLength={240}
                      />
                    </label>
                    <label className="wide">
                      <span>{copy.district}</span>
                      <select name="district" required defaultValue="">
                        <option value="" disabled>
                          {copy.districtPlaceholder}
                        </option>
                        {districts.map(([en, mfe]) => (
                          <option value={en} key={en}>
                            {language === "mfe" ? mfe : en}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </fieldset>

            <fieldset>
              <legend>{copy.paymentTitle}</legend>
              <div className="shop-choice-grid payment">
                {(["card", "juice", "cash"] as const).map((method) => {
                  const unavailable =
                    delivery === "pickup" && method !== "cash";
                  const title =
                    method === "cash" && delivery === "pickup"
                      ? copy.payment.cash.pickupTitle
                      : copy.payment[method].title;
                  const body =
                    method === "cash" && delivery === "pickup"
                      ? copy.payment.cash.pickupBody
                      : copy.payment[method].body;

                  return (
                    <label
                      className={unavailable ? "unavailable" : ""}
                      key={method}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === method}
                        onChange={() => setPayment(method)}
                        disabled={unavailable}
                      />
                      <span>
                        {method === "cash" ? (
                          <Banknote size={21} aria-hidden="true" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className={`shop-payment-brand is-${method}`}
                          >
                            <Image
                              alt=""
                              fill
                              sizes="72px"
                              src={
                                method === "card"
                                  ? "/shop/payment/mastercard.jpg"
                                  : "/shop/payment/mcb-juice.png"
                              }
                              unoptimized
                            />
                          </span>
                        )}
                        <strong>{title}</strong>
                        <small>{body}</small>
                      </span>
                    </label>
                  );
                })}
              </div>

              {delivery === "pickup" && (
                <p className="shop-payment-restriction">
                  <LockKeyhole size={17} aria-hidden="true" />
                  {copy.pickupRestriction}
                </p>
              )}

              {(payment === "card" || payment === "juice") && (
                <p className="shop-demo-warning">
                  <LockKeyhole size={18} aria-hidden="true" />
                  {copy.demoWarning}
                </p>
              )}

              {payment === "card" && delivery !== "pickup" && (
                <div className="shop-payment-fields">
                  <label className="wide">
                    <span>{copy.cardName}</span>
                    <input
                      name="demoCardName"
                      type="text"
                      autoComplete="off"
                      required
                      maxLength={80}
                    />
                  </label>
                  <label className="wide">
                    <span>{copy.cardNumber}</span>
                    <input
                      name="demoCardNumber"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0000 0000 0000 0000"
                      pattern="[0-9 ]{12,23}"
                      required
                      maxLength={23}
                    />
                  </label>
                  <label>
                    <span>{copy.expiry}</span>
                    <input
                      name="demoExpiry"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="MM/AA"
                      pattern="[0-9]{2}/[0-9]{2}"
                      required
                      maxLength={5}
                    />
                  </label>
                  <label>
                    <span>{copy.securityCode}</span>
                    <input
                      name="demoSecurityCode"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000"
                      pattern="[0-9]{3,4}"
                      required
                      maxLength={4}
                    />
                  </label>
                </div>
              )}

              {payment === "juice" && delivery !== "pickup" && (
                <div className="shop-payment-fields">
                  <label>
                    <span>{copy.juiceNumber}</span>
                    <input
                      name="demoJuiceNumber"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="5000 0000"
                      pattern="[0-9 ]{8,12}"
                      required
                      maxLength={12}
                    />
                  </label>
                  <label>
                    <span>{copy.juiceReference}</span>
                    <input
                      name="demoJuiceReference"
                      type="text"
                      autoComplete="off"
                      placeholder="DEMO-001"
                      required
                      maxLength={20}
                    />
                  </label>
                </div>
              )}

              {payment === "cash" && (
                <p className="shop-cash-note">
                  <Banknote size={18} aria-hidden="true" />
                  {delivery === "pickup"
                    ? copy.payment.cash.pickupBody
                    : copy.cashNote}
                </p>
              )}
            </fieldset>
          </div>

          <aside className="shop-order-summary">
            <MapPin size={24} aria-hidden="true" />
            <h3>{copy.summaryTitle}</h3>
            <div className="shop-order-mini-lines">
              {lines.map(({ product, option, quantity }) => (
                <p key={`${product.id}-${option.id}`}>
                  <span>
                    {quantity} ×{" "}
                    {language === "mfe"
                      ? product.kreolName
                      : product.englishName}
                  </span>
                  <strong>
                    Rs{" "}
                    {(option.priceMUR * quantity).toLocaleString("en-MU")}
                  </strong>
                </p>
              ))}
            </div>
            <dl>
              <div>
                <dt>{copy.items}</dt>
                <dd>Rs {subtotal.toLocaleString("en-MU")}</dd>
              </div>
              {discount > 0 && (
                <div className="discount">
                  <dt>
                    {copy.discount} · {coupon?.code}
                  </dt>
                  <dd>- Rs {discount.toLocaleString("en-MU")}</dd>
                </div>
              )}
              <div>
                <dt>{copy.deliveryFee}</dt>
                <dd>
                  {deliveryFee === 0
                    ? copy.free
                    : `Rs ${deliveryFee.toLocaleString("en-MU")}`}
                </dd>
              </div>
              <div className="total">
                <dt>{copy.total}</dt>
                <dd>Rs {total.toLocaleString("en-MU")}</dd>
              </div>
            </dl>
            <button type="submit">
              {copy.submit}
              <CircleCheck size={19} />
            </button>
            <p>
              <LockKeyhole size={15} aria-hidden="true" />
              {copy.secureNote}
            </p>
          </aside>
        </form>
      </section>
    </div>
  );
}
