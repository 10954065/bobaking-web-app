import { prisma } from "@/db/client";
import type { RiderStatus } from "@prisma/client";
import { hashPassword } from "@/modules/auth/services/password.service";
import { assignRoleToUser } from "@/modules/users/services/user.service";
import { ROLES } from "@/modules/roles/roles";
import { createRiderSchema, locationPingSchema, type CreateRiderInput, type LocationPingInput } from "@/modules/delivery/schemas/rider.schema";

/** Creates the User + RiderProfile + RIDER role grant together — a rider is a normal staff User, RiderProfile only adds the fields most users don't need. */
export async function createRider(input: CreateRiderInput) {
  const data = createRiderSchema.parse(input);
  if (!data.email && !data.phone) {
    throw new Error("A rider requires at least an email or a phone number.");
  }

  const riderRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.RIDER } });
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
      },
    });

    await tx.riderProfile.create({
      data: {
        userId: created.id,
        branchId: data.branchId,
        vehicleType: data.vehicleType,
        plateNumber: data.plateNumber,
      },
    });

    return created;
  });

  await assignRoleToUser({ userId: user.id, roleId: riderRole.id, branchId: data.branchId });
  return user;
}

export async function listRidersForBranch(branchId: string) {
  return prisma.riderProfile.findMany({
    where: { branchId },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });
}

export async function getRiderProfileByUserId(userId: string) {
  return prisma.riderProfile.findUnique({ where: { userId } });
}

export async function setRiderStatus(userId: string, status: RiderStatus) {
  return prisma.riderProfile.update({ where: { userId }, data: { status } });
}

export async function updateRiderLocation(userId: string, input: LocationPingInput) {
  const data = locationPingSchema.parse(input);
  return prisma.riderProfile.update({
    where: { userId },
    data: { currentLatitude: data.latitude, currentLongitude: data.longitude, lastLocationAt: new Date() },
  });
}
