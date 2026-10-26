import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";

export const LOTTIE_URLS = {
  aiProcessing: "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json",
  listening: "https://assets3.lottiefiles.com/packages/lf20_qp1q7mct.json",
  weather: "https://assets3.lottiefiles.com/private_files/lf30_jmgekcbq.json",
  scanning: "https://assets1.lottiefiles.com/packages/lf20_pNx6yH.json",
  success: "https://assets9.lottiefiles.com/packages/lf20_U6OKyK.json",
};

interface LottieAnimationProps {
  url?: string;
  animationData?: object;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  url,
  animationData,
  loop = true,
  autoplay = true,
  className = "",
}) => {
  const [data, setData] = useState<object | null>(animationData ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (animationData) {
      setData(animationData);
      setFailed(false);
      return;
    }

    if (!url) {
      setData(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setData(null);
    setFailed(false);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Lottie request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((json: object) => {
        if (active) setData(json);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof Error && error.name === "AbortError")) {
          console.error("Unable to load animation:", error);
          setFailed(true);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, animationData]);

  if (!data || failed) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        {failed ? null : (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  if (typeof Lottie !== "function") {
    return <div className={className} aria-hidden="true" />;
  }

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  );
};