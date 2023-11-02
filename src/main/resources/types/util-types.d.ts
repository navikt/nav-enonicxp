export type PickByFieldType<ObjectType, FieldType> = {
    [Key in keyof ObjectType as ObjectType[Key] extends FieldType ? Key : never]: ObjectType[Key];
};

export type EmptyObject = Record<string, never>;

export type ArrayOrSingle<Type> = Type[] | Type;

export type OptionalReadonly<Type> = Readonly<Type> | Type;
