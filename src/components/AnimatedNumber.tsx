import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  end: number;
  duration?: number;
  decimals?: number;
  separator?: string;
  delay?: number;
}

const AnimatedNumber = ({
  end,
  duration = 2,
  decimals = 0,
  separator = ",",
  delay = 0,
}: AnimatedNumberProps) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const startAnimation = () => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const progress = Math.min(
          (currentTime - startTime) / (duration * 1000),
          1
        );

        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setValue(end * easedProgress);

        if (progress < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };

      frameId = requestAnimationFrame(animate);
    };

    timeoutId = setTimeout(startAnimation, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
    };
  }, [end, duration, delay]);

  const formatted = value.toFixed(decimals);
  const [integerPart, decimalPart] = formatted.split(".");
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    separator
  );

  return (
    <span>
      {groupedInteger}
      {decimalPart !== undefined ? `.${decimalPart}` : ""}
    </span>
  );
};

export default AnimatedNumber;
