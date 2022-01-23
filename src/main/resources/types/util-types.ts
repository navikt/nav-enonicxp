export type NotUndefinedOrNull<Type> = Exclude<Type, undefined | null>;

export type PickByFieldType<ObjectType, FieldType> = {
    [Key in keyof ObjectType as ObjectType[Key] extends FieldType
        ? Key
        : never]: ObjectType[Key];
};

export type EmptyObject = Record<string, never>;
