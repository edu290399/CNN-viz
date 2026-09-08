export type LegendItem = {
  color: string;
  label: string;
  /** Renderiza o marcador como contorno (útil para "janela deslizante"). */
  outline?: boolean;
};

export default function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={
              item.outline
                ? { boxShadow: `inset 0 0 0 2px ${item.color}` }
                : { backgroundColor: item.color }
            }
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
