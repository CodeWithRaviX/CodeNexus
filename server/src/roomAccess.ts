export interface RoomAccessResult {
  allowed: boolean;
  createRoom: boolean;
  error?: string;
}

export const canJoinRoom = (
  roomPassword: string | undefined,
  suppliedPassword: string | undefined,
): RoomAccessResult => {
  if (!roomPassword) {
    return {
      allowed: false,
      createRoom: true,
      error: "Room password is required",
    };
  }

  if (!suppliedPassword) {
    return {
      allowed: false,
      createRoom: false,
      error: "Room password is required",
    };
  }

  if (roomPassword !== suppliedPassword) {
    return {
      allowed: false,
      createRoom: false,
      error: "Incorrect room password",
    };
  }

  return {
    allowed: true,
    createRoom: false,
  };
};
