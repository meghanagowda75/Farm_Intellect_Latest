interface AnimatedNumberProps {
  end: number;
  duration?: number;
  decimals?: number;
  separator?: string;
  delay?: number;
}

const AnimatedNumber = ({
  end,
  decimals = 0,
  separator = ",",
}: AnimatedNumberProps) => {
  const formatted = end.toFixed(decimals);
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
