import {
  Box,
  Card,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { useGetDashboardQuery } from "../../api/apiSlice";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../../theme/leadDisplay";

function KpiCard({ label, value, accent }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, height: "100%" }} elevation={0} variant="outlined">
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color: accent || "text.primary" }}>
        {value}
      </Typography>
    </Card>
  );
}

/** A titled card listing clickable leads/follow-ups, with an empty state. */
function LeadListCard({ title, empty, items, onSelect }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, height: "100%" }} elevation={0} variant="outlined">
      <Typography variant="subtitle1" fontWeight={600} mb={1}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      ) : (
        <List dense>
          {items.map((item) => (
            <ListItem key={item.key} button onClick={() => onSelect(item.to)} sx={{ borderRadius: 2 }}>
              <ListItemText primary={item.primary} secondary={item.secondary} />
            </ListItem>
          ))}
        </List>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useGetDashboardQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box py={4}>
        <Typography variant="h6" color="error">Unable to load dashboard.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {error?.data?.message || "The dashboard could not be loaded. Please try again."}
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box py={4}>
        <Typography variant="h6">No dashboard data is available.</Typography>
      </Box>
    );
  }

  const statusChartData = data.statusBreakdown.map((s) => ({
    name: STATUS_CONFIG[s.status]?.label || s.status,
    count: s.count,
    color: STATUS_CONFIG[s.status]?.color || "#5A5F73",
  }));

  const priorityChartData = data.priorityBreakdown.map((p) => ({
    name: PRIORITY_CONFIG[p.priority]?.label || p.priority,
    count: p.count,
    color: PRIORITY_CONFIG[p.priority]?.color || "#5A5F73",
  }));

  const isOwn = data.scope === "own";
  const title =
    data.scope === "own" ? "My Dashboard" : data.scope === "team" ? "Team Dashboard" : "Organization Dashboard";
  const overdueCount = data.overdueFollowUps.length;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isOwn
            ? "Your assigned leads and follow-ups."
            : data.scope === "team"
              ? "Leads and follow-ups for you and your team."
              : "Every lead and follow-up in your organization."}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <KpiCard label={isOwn ? "My Open Leads" : "Open Leads"} value={data.openLeads} accent="#3730A3" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="New (Not Yet Contacted)" value={data.newLeads} accent="#0891B2" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Follow-Ups Due Today" value={data.dueTodayCount} accent="#B45309" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            label="Overdue Follow-Ups"
            value={overdueCount}
            accent={overdueCount > 0 ? "#B91C1C" : undefined}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Resolved (Converted + Lost)" value={data.resolvedCount} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Converted" value={data.convertedCount} accent="#15803D" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Lost" value={data.lostCount} accent="#B91C1C" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Conversion Rate" value={`${data.conversionRate}%`} accent="#3730A3" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <LeadListCard
            title={`Newly Assigned (last 7 days) — ${data.recentlyAssigned.length}`}
            empty="No leads assigned recently."
            items={data.recentlyAssigned.map((lead) => ({
              key: lead.id,
              to: `/leads/${lead.id}`,
              primary: `${lead.leadCode} — ${lead.clientName}`,
              secondary: `${STATUS_CONFIG[lead.status]?.label || lead.status} · ${
                PRIORITY_CONFIG[lead.priority]?.label || lead.priority
              } priority · assigned ${new Date(lead.assignmentDate).toLocaleDateString()}`,
            }))}
            onSelect={navigate}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <LeadListCard
            title={`Upcoming Follow-Ups — ${data.upcomingFollowUps.length}`}
            empty="No upcoming follow-ups scheduled."
            items={data.upcomingFollowUps.map((f) => ({
              key: f.id,
              to: `/leads/${f.lead.id}`,
              primary: `${f.lead.leadCode} — ${f.lead.clientName}`,
              secondary: `Due ${new Date(f.dueAt).toLocaleString()}${isOwn ? "" : ` · Owner: ${f.owner.fullName}`}`,
            }))}
            onSelect={navigate}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2.5, borderRadius: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Leads by Status
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2.5, borderRadius: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Leads by Priority
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityChartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} hide />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      <LeadListCard
        title={`Overdue Follow-Ups (${overdueCount})`}
        empty="Nothing overdue — you're all caught up."
        items={data.overdueFollowUps.map((f) => ({
          key: f.id,
          to: `/leads/${f.lead.id}`,
          primary: `${f.lead.leadCode} — ${f.lead.clientName}`,
          secondary: `Due ${new Date(f.dueAt).toLocaleString()}${isOwn ? "" : ` · Owner: ${f.owner.fullName}`}`,
        }))}
        onSelect={navigate}
      />
    </Stack>
  );
}
