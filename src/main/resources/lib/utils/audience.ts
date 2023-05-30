export const getAudience = (audience?: { _selected: string } | string) =>
    typeof audience === 'string' ? audience : audience?._selected;
