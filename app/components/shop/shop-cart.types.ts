import type {
  ShopProduct,
  ShopProductOption,
} from "../../backend/pages/shop.service";

export type ShopCartLine = {
  product: ShopProduct;
  option: ShopProductOption;
  quantity: number;
};

export type ShopCoupon = {
  code: "REKOLT10" | "MORIS50";
  kind: "percent" | "fixed";
  value: number;
};

/** Coupon arithmetic is shared by the cart drawer and checkout summary. */
export function calculateCouponDiscount(
  subtotal: number,
  coupon: ShopCoupon | null,
): number {
  if (!coupon) return 0;
  const discount =
    coupon.kind === "percent"
      ? subtotal * (coupon.value / 100)
      : coupon.value;
  return Math.min(subtotal, Math.round(discount));
}
