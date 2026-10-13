const profileService = require("../services/profile.service");
const { asyncHandler } = require("../utils/http");
const {
  updateProfileSchema,
  changePasswordSchema,
  profileIdParamSchema,
} = require("../validators/profile.schema");

const getMine = asyncHandler(async (req, res) => {
  res.json(await profileService.getOwnProfile(req.user.id));
});

const updateMine = asyncHandler(async (req, res) => {
  const input = updateProfileSchema.parse(req.body);
  res.json(await profileService.updateOwnProfile(req.user, input));
});

const changePassword = asyncHandler(async (req, res) => {
  const input = changePasswordSchema.parse(req.body);
  res.json(await profileService.changeOwnPassword(req.user, input));
});

const listVisible = asyncHandler(async (req, res) => {
  res.json(await profileService.listVisibleProfiles(req.user));
});

const getVisible = asyncHandler(async (req, res) => {
  const { userId } = profileIdParamSchema.parse(req.params);
  res.json(await profileService.getVisibleProfile(req.user, userId));
});

module.exports = {
  getMine,
  updateMine,
  changePassword,
  listVisible,
  getVisible,
};
