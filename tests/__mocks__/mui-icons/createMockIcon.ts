/**
 * Generates a placeholder React component used to stub Material UI icons during Vitest runs.
 *
 * @param displayName - Name assigned to the generated mock component for debug readability.
 * @returns A React component that renders nothing.
 */
const createMockIcon = (displayName: string) => {
  const MockIcon = () => null;
  MockIcon.displayName = displayName;
  return MockIcon;
};

export default createMockIcon;
