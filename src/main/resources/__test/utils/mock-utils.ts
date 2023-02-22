export const mockReturnValue = (func: (...args: any) => any, returnValue: any) =>
    (func as jest.Mock<any>).mockImplementation(() => returnValue);
