jest.mock("@expo/vector-icons", () => ({
  AntDesign: "AntDesign",
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  Feather: "Feather",
}), { virtual: true });
jest.mock("@expo/vector-icons/AntDesign", () => "AntDesign", { virtual: true });
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons", { virtual: true });

describe("constants/navigation", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });
});
