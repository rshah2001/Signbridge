import "@testing-library/jest-dom";

jest.mock("axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
  };

  return {
    create: jest.fn(() => instance),
    __instance: instance,
  };
});
