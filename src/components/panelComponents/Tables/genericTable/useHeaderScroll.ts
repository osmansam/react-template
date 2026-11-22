import { useEffect, useRef, useState } from "react";

export const useHeaderScroll = (usedColumnsLength: number | undefined) => {
  const [showHeaderLeftButton, setShowHeaderLeftButton] = useState(false);
  const [showHeaderRightButton, setShowHeaderRightButton] = useState(false);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  const checkHeaderScrollButtons = () => {
    if (headerScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = headerScrollRef.current;
      setShowHeaderLeftButton(scrollLeft > 10);
      setShowHeaderRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollHeaderToDirection = (direction: "left" | "right") => {
    if (headerScrollRef.current) {
      const scrollAmount = 200;
      headerScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkHeaderScrollButtons();
    const container = headerScrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkHeaderScrollButtons);
      window.addEventListener("resize", checkHeaderScrollButtons);
      return () => {
        container.removeEventListener("scroll", checkHeaderScrollButtons);
        window.removeEventListener("resize", checkHeaderScrollButtons);
      };
    }
  }, [usedColumnsLength]);

  return {
    showHeaderLeftButton,
    showHeaderRightButton,
    headerScrollRef,
    scrollHeaderToDirection,
  };
};
