"use client";

import {
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sprout,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  ShopCatalogue,
  ShopProduct,
  ShopProductOption,
} from "../../backend/pages/shop.service";
import { useLanguage } from "../../context/LanguageContext";
import { useShopCart } from "../../hooks/useShopCart";
import { Footer } from "../Footer";
import { Header } from "../Header";
import { ShopCartDrawer } from "../shop/ShopCartDrawer";
import { ShopCheckout } from "../shop/ShopCheckout";
import type { ShopCoupon } from "../shop/shop-cart.types";

type ShopFilter = "all" | "plants" | "inputs";

const shopCopy = {
  mfe: {
    eyebrow: "Magazin agrikol Moris",
    title: "Plant, nouri, proteze.",
    body: "Dekouver tou 46 prodwi dan katalog-la, depi semans ek zenn plant ziska bann prodwi pou later ek proteksion rekolt.",
    welcome: "Bienveni",
    logout: "Dekonekte",
    search: "Rod enn prodwi…",
    filters: {
      all: "Tou prodwi",
      plants: "Semans ek plant",
      inputs: "Prodwi agrikol",
    },
    results: "prodwi pe afise",
    from: "Depi",
    cart: "Panie",
    add: "Azout",
    added: "finn azoute dan ou panie.",
    optionLabels: {
      start: "Koumans depi zero",
      direct: "Pare pou plante",
      standard: "Format disponib",
    },
    purpose: "Pou ki servi",
    catalogueNotice:
      "Katalog demonstrasion. Pou bann prodwi tretman, swiv etikett, lalwa lokal ek konsey enn profesionnnel agrikol.",
    empty: "Pena prodwi ki koresponn ar ou resers.",
  },
  en: {
    eyebrow: "Mauritius agricultural shop",
    title: "Plant, nourish, protect.",
    body: "Browse all 46 catalogue products, from seeds and young plants to soil inputs and crop-protection supplies.",
    welcome: "Welcome",
    logout: "Sign out",
    search: "Search products…",
    filters: {
      all: "All products",
      plants: "Seeds & plants",
      inputs: "Agricultural inputs",
    },
    results: "products shown",
    from: "From",
    cart: "Cart",
    add: "Add",
    added: "was added to your cart.",
    optionLabels: {
      start: "Starting from scratch",
      direct: "Ready to plant",
      standard: "Available format",
    },
    purpose: "Purpose",
    catalogueNotice:
      "Demonstration catalogue. For crop-treatment products, follow the label, local law and qualified agricultural advice.",
    empty: "No products match your search.",
  },
} as const;

function ProductCard({
  product,
  language,
  onAdd,
}: {
  product: ShopProduct;
  language: "mfe" | "en";
  onAdd: (product: ShopProduct, option: ShopProductOption) => void;
}) {
  const copy = shopCopy[language];
  const name = language === "mfe" ? product.kreolName : product.englishName;
  const subcategory =
    language === "mfe" ? product.subcategoryMfe : product.subcategory;
  const description =
    language === "mfe" ? product.descriptionMfe : product.description;
  const purpose =
    language === "mfe" ? product.usagePurposeMfe : product.usagePurpose;

  return (
    <article className="shop-product-card">
      <div className="shop-product-image">
        <Image
          src={product.image}
          width={1200}
          height={800}
          alt={
            language === "mfe"
              ? `${name}, prodwi dan katalog`
              : `${name}, catalogue product`
          }
          unoptimized
        />
        <span>{subcategory}</span>
      </div>

      <div className="shop-product-body">
        <div className="shop-product-title">
          <span>{product.id}</span>
          <strong>
            {copy.from} Rs {product.priceFrom.toLocaleString("en-MU")}
          </strong>
        </div>
        <h2>{name}</h2>
        <p>{description}</p>

        <div className="shop-product-options">
          {product.options.map((option) => (
            <div key={`${product.id}-${option.id}`}>
              <span>{copy.optionLabels[option.label]}</span>
              <strong>Rs {option.priceMUR.toLocaleString("en-MU")}</strong>
              <p>
                {language === "mfe" ? option.formMfe : option.form} ·{" "}
                {language === "mfe" ? option.unitMfe : option.unit}
              </p>
              <button
                className="shop-add-button"
                type="button"
                onClick={() => onAdd(product, option)}
              >
                <Plus size={15} aria-hidden="true" />
                {copy.add}
              </button>
            </div>
          ))}
        </div>

        {purpose && (
          <div className="shop-product-purpose">
            <Sparkles size={16} aria-hidden="true" />
            <p>
              <span>{copy.purpose}</span>
              {purpose}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

/** Protected catalogue with bilingual filters and stable product cards. */
export function ShopCataloguePage({
  catalogue,
  username,
}: {
  catalogue: ShopCatalogue;
  username: string;
}) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const copy = shopCopy[language];
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [query, setQuery] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutCoupon, setCheckoutCoupon] =
    useState<ShopCoupon | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const cart = useShopCart(username);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en");
    return catalogue.products.filter((product) => {
      const categoryMatches =
        filter === "all" || product.category === filter;
      const queryMatches =
        !normalizedQuery ||
        [
          product.englishName,
          product.kreolName,
          product.subcategory,
          product.subcategoryMfe,
          product.id,
        ].some((value) =>
          value.toLocaleLowerCase("en").includes(normalizedQuery),
        );
      return categoryMatches && queryMatches;
    });
  }, [catalogue.products, filter, query]);

  const cartLines = useMemo(
    () =>
      cart.items.flatMap((item) => {
        const product = catalogue.products.find(
          (candidate) => candidate.id === item.productId,
        );
        const option = product?.options.find(
          (candidate) => candidate.id === item.optionId,
        );
        return product && option
          ? [{ product, option, quantity: item.quantity }]
          : [];
      }),
    [cart.items, catalogue.products],
  );

  useEffect(() => {
    if (!addedNotice) return;
    const timer = window.setTimeout(() => setAddedNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [addedNotice]);

  const addToCart = (
    product: ShopProduct,
    option: ShopProductOption,
  ) => {
    cart.addItem(product.id, option.id);
    const name =
      language === "mfe" ? product.kreolName : product.englishName;
    setAddedNotice(`${name} ${copy.added}`);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/shop-auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.push("/magazin/login");
    }
  };

  return (
    <main className="shop-catalogue-page" data-shop-catalog>
      <div className="shop-catalogue-header">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath="/magazin"
        />
      </div>

      <section className="shop-catalogue-hero">
        <div className="shop-catalogue-copy">
          <span className="eyebrow light">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>

          <div className="shop-account-chip">
            <span>
              <Sprout size={17} aria-hidden="true" />
              {copy.welcome}, <strong>{username}</strong>
            </span>
            <button type="button" onClick={logout} disabled={loggingOut}>
              <LogOut size={17} />
              {copy.logout}
            </button>
            <button type="button" onClick={() => setCartOpen(true)}>
              <ShoppingCart size={17} />
              {copy.cart}
              <b>{cart.itemCount}</b>
            </button>
          </div>
        </div>

        <div className="shop-hero-visual">
          <Image
            src="/shop/soil-growing-media.webp"
            width={1200}
            height={800}
            alt=""
            priority
            // This local WebP bypasses the optional platform image binding.
            unoptimized
          />
          <div>
            <ShoppingBag size={24} aria-hidden="true" />
            <strong>{catalogue.productCount}</strong>
            <span>{copy.filters.all}</span>
          </div>
        </div>
      </section>

      <section className="shop-toolbar" aria-label="Catalogue filters">
        <label className="shop-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder={copy.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="shop-filter-list">
          {(["all", "plants", "inputs"] as const).map((option) => (
            <button
              className={filter === option ? "active" : ""}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              key={option}
            >
              {copy.filters[option]}
              <span>
                {option === "all"
                  ? catalogue.productCount
                  : option === "plants"
                    ? catalogue.plantCount
                    : catalogue.inputCount}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="shop-result-count" aria-live="polite">
        <strong>{String(visibleProducts.length).padStart(2, "0")}</strong>
        <span>{copy.results}</span>
      </div>

      {visibleProducts.length > 0 ? (
        <section className="shop-product-grid">
          {visibleProducts.map((product) => (
            <ProductCard
              product={product}
              language={language}
              onAdd={addToCart}
              key={product.id}
            />
          ))}
        </section>
      ) : (
        <p className="shop-empty-state">{copy.empty}</p>
      )}

      <aside className="shop-catalogue-notice">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>{copy.catalogueNotice}</p>
      </aside>

      <button
        className="shop-floating-cart"
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`${copy.cart}: ${cart.itemCount}`}
      >
        <ShoppingCart size={19} />
        <span>{copy.cart}</span>
        <b>{cart.itemCount}</b>
      </button>

      {addedNotice && (
        <div className="shop-cart-toast" role="status">
          <ShoppingCart size={18} aria-hidden="true" />
          {addedNotice}
        </div>
      )}

      {cartOpen && (
        <ShopCartDrawer
          language={language}
          lines={cartLines}
          onClose={() => setCartOpen(false)}
          onClear={cart.clearCart}
          onRemove={cart.removeItem}
          onQuantityChange={cart.updateQuantity}
          onCheckout={(coupon) => {
            setCheckoutCoupon(coupon);
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {checkoutOpen && (
        <ShopCheckout
          language={language}
          lines={cartLines}
          coupon={checkoutCoupon}
          onBack={() => {
            setCheckoutOpen(false);
            setCartOpen(true);
          }}
          onClose={() => setCheckoutOpen(false)}
          onComplete={cart.clearCart}
        />
      )}

      <Footer language={language} />
    </main>
  );
}
