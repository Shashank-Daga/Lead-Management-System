const leadService = require("../services/lead.service");
const followUpService = require("../services/followUp.service");
const { asyncHandler } = require("../utils/http");
const {
  createLeadSchema,
  updateLeadSchema,
  changeStatusSchema,
  changePrioritySchema,
  assignLeadSchema,
  addNoteSchema,
  updateNoteSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
  listLeadsQuerySchema,
} = require("../validators/lead.schema");

const create = asyncHandler(async (req, res) => {
  const input = createLeadSchema.parse(req.body);
  const lead = await leadService.createLead(req.user, input);
  res.status(201).json(lead);
});

const list = asyncHandler(async (req, res) => {
  const query = listLeadsQuerySchema.parse(req.query);
  const result = await leadService.listLeads(req.user, query);
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadForUser(req.user, req.params.leadId);
  res.json(lead);
});

const update = asyncHandler(async (req, res) => {
  const input = updateLeadSchema.parse(req.body);
  const lead = await leadService.updateLead(req.user, req.params.leadId, input);
  res.json(lead);
});

const changeStatus = asyncHandler(async (req, res) => {
  const input = changeStatusSchema.parse(req.body);
  const lead = await leadService.changeStatus(req.user, req.params.leadId, input);
  res.json(lead);
});

const changePriority = asyncHandler(async (req, res) => {
  const input = changePrioritySchema.parse(req.body);
  const lead = await leadService.changePriority(req.user, req.params.leadId, input);
  res.json(lead);
});

const assign = asyncHandler(async (req, res) => {
  const input = assignLeadSchema.parse(req.body);
  const lead = await leadService.assignLead(req.user, req.params.leadId, input);
  res.json(lead);
});

const remove = asyncHandler(async (req, res) => {
  await leadService.softDeleteLead(req.user, req.params.leadId);
  res.status(204).send();
});

const history = asyncHandler(async (req, res) => {
  const events = await leadService.getLeadHistory(req.user, req.params.leadId);
  res.json(events);
});

const addNote = asyncHandler(async (req, res) => {
  const input = addNoteSchema.parse(req.body);
  const note = await leadService.addNote(req.user, req.params.leadId, input);
  res.status(201).json(note);
});

const listNotes = asyncHandler(async (req, res) => {
  const notes = await leadService.listNotes(req.user, req.params.leadId);
  res.json(notes);
});

const updateNote = asyncHandler(async (req, res) => {
  const input = updateNoteSchema.parse(req.body);
  const note = await leadService.updateNote(req.user, req.params.leadId, req.params.noteId, input);
  res.json(note);
});

const deleteNote = asyncHandler(async (req, res) => {
  await leadService.deleteNote(req.user, req.params.leadId, req.params.noteId);
  res.status(204).send();
});

const createFollowUp = asyncHandler(async (req, res) => {
  const input = createFollowUpSchema.parse(req.body);
  const followUp = await followUpService.createFollowUp(req.user, req.params.leadId, input);
  res.status(201).json(followUp);
});

const listFollowUps = asyncHandler(async (req, res) => {
  const followUps = await followUpService.listFollowUps(req.user, req.params.leadId);
  res.json(followUps);
});

const updateFollowUp = asyncHandler(async (req, res) => {
  const input = updateFollowUpSchema.parse(req.body);
  const followUp = await followUpService.updateFollowUp(
    req.user,
    req.params.leadId,
    req.params.followUpId,
    input
  );
  res.json(followUp);
});

const deleteFollowUp = asyncHandler(async (req, res) => {
  await followUpService.deleteFollowUp(req.user, req.params.leadId, req.params.followUpId);
  res.status(204).send();
});

module.exports = {
  create,
  list,
  getById,
  update,
  changeStatus,
  changePriority,
  assign,
  remove,
  history,
  addNote,
  listNotes,
  updateNote,
  deleteNote,
  createFollowUp,
  listFollowUps,
  updateFollowUp,
  deleteFollowUp,
};
