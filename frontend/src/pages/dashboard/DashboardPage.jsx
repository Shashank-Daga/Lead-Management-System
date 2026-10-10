import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  AssignmentTurnedInOutlined,
  AutorenewOutlined,
  CheckCircleOutline,
  ErrorOutline,
  GroupsOutlined,
  TrendingUpOutlined,
  FiberNewOutlined,
  EventOutlined,
  ArrowForwardOutlined,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { useGetDashboardQuery } from "../../api/apiSlice";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "../../theme/leadDisplay";

const KPI_CONFIG = {
  open: {
    icon: <GroupsOutlined />,
    label: "Open Leads",
  },
  new: {
    icon: <FiberNewOutlined />,
    label: "New Leads",
  },
  due: {
    icon: <EventOutlined />,
    label: "Due Today",
  },
  overdue: {
    icon: <ErrorOutline />,
    label: "Overdue",
  },
  resolved: {
    icon: <AssignmentTurnedInOutlined />,
    label: "Resolved",
  },
  converted: {
    icon: <CheckCircleOutline />,
    label: "Converted",
  },
  lost: {
    icon: <ErrorOutline />,
    label: "Lost",
  },
  conversion: {
    icon: <TrendingUpOutlined />,
    label: "Conversion Rate",
  },
};

const KPI_ACCENTS = {
  primary: "primary.main",
  info: "info.main",
  warning: "warning.main",
  error: "error.main",
  success: "success.main",
  neutral: "text.secondary",
};

function DashboardSkeleton() {
  return (
    <Stack spacing={3}>
      <Box>
        <Skeleton variant="text" width={220} height={38} />
        <Skeleton variant="text" width={360} height={24} />
      </Box>

      <Grid container spacing={2}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card
              variant="outlined"
              sx={{
                height: 128,
                borderRadius: 2.5,
              }}
            >
              <CardContent>
                <Skeleton
                  variant="rounded"
                  width={38}
                  height={38}
                  sx={{ mb: 1.5 }}
                />
                <Skeleton variant="text" width="55%" />
                <Skeleton variant="text" width="35%" height={34} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: 350 }}>
            <CardContent>
              <Skeleton variant="text" width={190} />
              <Skeleton
                variant="rectangular"
                height={270}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: 350 }}>
            <CardContent>
              <Skeleton variant="text" width={190} />
              <Skeleton
                variant="rectangular"
                height={270}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent = "primary",
  helper,
}) {
  const accentColor =
    KPI_ACCENTS[accent] || KPI_ACCENTS.primary;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 2.5,
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",

        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.07)",
          borderColor: "rgba(55, 48, 163, 0.22)",
        },
      }}
    >
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={600}
              noWrap
            >
              {label}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 0.75,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: accentColor,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 2,
              color: accentColor,
              bgcolor:
                accent === "error"
                  ? "rgba(185, 28, 28, 0.08)"
                  : accent === "success"
                    ? "rgba(21, 128, 61, 0.08)"
                    : accent === "warning"
                      ? "rgba(180, 83, 9, 0.09)"
                      : "rgba(55, 48, 163, 0.08)",
            }}
          >
            {icon}
          </Box>
        </Stack>

        {helper && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 1,
            }}
          >
            {helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  action,
}) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 1.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          fontWeight={750}
        >
          {title}
          {typeof count === "number" && (
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ ml: 1 }}
            >
              {count}
            </Typography>
          )}
        </Typography>

        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );
}

/**
 * Reusable dashboard list card.
 * Items remain clickable and continue navigating to the
 * corresponding lead detail page.
 */
function LeadListCard({
  title,
  subtitle,
  empty,
  items,
  onSelect,
  count,
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 2.5,
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          "&:last-child": {
            pb: { xs: 2, sm: 2.5 },
          },
        }}
      >
        <SectionHeader
          title={title}
          subtitle={subtitle}
          count={count}
        />

        {items.length === 0 ? (
          <Box
            sx={{
              minHeight: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 2,
            }}
          >
            <Box>
              <CheckCircleOutline
                sx={{
                  fontSize: 36,
                  color: "success.main",
                  opacity: 0.7,
                  mb: 1,
                }}
              />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {empty}
              </Typography>
            </Box>
          </Box>
        ) : (
          <List
            disablePadding
            sx={{
              mx: -1,
            }}
          >
            {items.map((item) => (
              <ListItemButton
                key={item.key}
                onClick={() => onSelect(item.to)}
                sx={{
                  borderRadius: 2,
                  px: 1,
                  py: 1.1,
                  mb: 0.25,

                  "&:hover": {
                    bgcolor:
                      "rgba(55, 48, 163, 0.045)",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={650}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.primary}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.25,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: {
                          xs: "normal",
                          sm: "nowrap",
                        },
                      }}
                    >
                      {item.secondary}
                    </Typography>
                  }
                />

                <ArrowForwardOutlined
                  sx={{
                    ml: 1,
                    flexShrink: 0,
                    fontSize: 18,
                    color: "text.disabled",
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 2.5,
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          "&:last-child": {
            pb: { xs: 2, sm: 2.5 },
          },
        }}
      >
        <SectionHeader
          title={title}
          subtitle={subtitle}
        />

        <Box
          sx={{
            width: "100%",
            height: {
              xs: 245,
              sm: 270,
            },
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDashboardQuery();

  const navigate = useNavigate();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <Box
        sx={{
          maxWidth: 720,
          mx: "auto",
          py: { xs: 4, md: 8 },
        }}
      >
        <Alert
          severity="error"
          sx={{
            borderRadius: 2.5,
            alignItems: "flex-start",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<AutorenewOutlined />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          }
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
          >
            Unable to load dashboard
          </Typography>

          <Typography variant="body2">
            {error?.data?.message ||
              "The dashboard could not be loaded. Please try again."}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
        >
          No dashboard data is available
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.75 }}
        >
          Please refresh the page and try again.
        </Typography>

        <Button
          sx={{ mt: 2 }}
          variant="contained"
          onClick={() => refetch()}
        >
          Refresh dashboard
        </Button>
      </Box>
    );
  }

  const statusChartData = data.statusBreakdown.map(
    (item) => ({
      name:
        STATUS_CONFIG[item.status]?.label ||
        item.status,
      count: item.count,
      color:
        STATUS_CONFIG[item.status]?.color ||
        "#5A5F73",
    })
  );

  const priorityChartData =
    data.priorityBreakdown.map((item) => ({
      name:
        PRIORITY_CONFIG[item.priority]?.label ||
        item.priority,
      count: item.count,
      color:
        PRIORITY_CONFIG[item.priority]?.color ||
        "#5A5F73",
    }));

  const isOwn = data.scope === "own";

  const title =
    data.scope === "own"
      ? "My Dashboard"
      : data.scope === "team"
        ? "Team Dashboard"
        : "Organization Dashboard";

  const description = isOwn
    ? "Your assigned leads and follow-ups."
    : data.scope === "team"
      ? "Leads and follow-ups for you and your team."
      : "Every lead and follow-up in your organization.";

  const overdueCount =
    data.overdueFollowUps.length;

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      {/* =========================
          PAGE HEADER
      ========================== */}
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          {description}
        </Typography>
      </Box>

      {/* =========================
          KPI CARDS
      ========================== */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label={
              isOwn ? "My Open Leads" : "Open Leads"
            }
            value={data.openLeads}
            icon={KPI_CONFIG.open.icon}
            accent="primary"
            helper="Currently being worked"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="New Leads"
            value={data.newLeads}
            icon={KPI_CONFIG.new.icon}
            accent="info"
            helper="Not yet contacted"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Follow-Ups Due Today"
            value={data.dueTodayCount}
            icon={KPI_CONFIG.due.icon}
            accent="warning"
            helper="Needs attention today"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Overdue Follow-Ups"
            value={overdueCount}
            icon={KPI_CONFIG.overdue.icon}
            accent={
              overdueCount > 0
                ? "error"
                : "success"
            }
            helper={
              overdueCount > 0
                ? "Requires attention"
                : "Nothing overdue"
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Resolved"
            value={data.resolvedCount}
            icon={KPI_CONFIG.resolved.icon}
            accent="neutral"
            helper="Converted + lost"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Converted"
            value={data.convertedCount}
            icon={KPI_CONFIG.converted.icon}
            accent="success"
            helper="Successfully converted"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Lost"
            value={data.lostCount}
            icon={KPI_CONFIG.lost.icon}
            accent="error"
            helper="Closed as lost"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Conversion Rate"
            value={`${data.conversionRate}%`}
            icon={KPI_CONFIG.conversion.icon}
            accent="primary"
            helper="Of resolved leads"
          />
        </Grid>
      </Grid>

      {/* =========================
          ACTIVITY / FOLLOW-UPS
      ========================== */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <LeadListCard
            title="Recently Assigned"
            subtitle="New assignments from the last 7 days"
            count={data.recentlyAssigned.length}
            empty="No leads have been assigned recently."
            items={data.recentlyAssigned.map(
              (lead) => ({
                key: lead.id,
                to: `/leads/${lead.id}`,
                primary: `${lead.leadCode} — ${lead.clientName}`,
                secondary: `${
                  STATUS_CONFIG[lead.status]
                    ?.label || lead.status
                } · ${
                  PRIORITY_CONFIG[lead.priority]
                    ?.label || lead.priority
                } priority · assigned ${new Date(
                  lead.assignmentDate
                ).toLocaleDateString()}`,
              })
            )}
            onSelect={navigate}
          />
        </Grid>

        <Grid item xs={12} lg={6}>
          <LeadListCard
            title="Upcoming Follow-Ups"
            subtitle="Your next scheduled follow-ups"
            count={data.upcomingFollowUps.length}
            empty="No upcoming follow-ups scheduled."
            items={data.upcomingFollowUps.map(
              (followUp) => ({
                key: followUp.id,
                to: `/leads/${followUp.lead.id}`,
                primary: `${followUp.lead.leadCode} — ${followUp.lead.clientName}`,
                secondary: `Due ${new Date(
                  followUp.dueAt
                ).toLocaleString()}${
                  isOwn
                    ? ""
                    : ` · Owner: ${followUp.owner.fullName}`
                }`,
              })
            )}
            onSelect={navigate}
          />
        </Grid>
      </Grid>

      {/* =========================
          CHARTS
      ========================== */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <ChartCard
            title="Leads by Status"
            subtitle="Current lead distribution"
          >
            {statusChartData.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  No status data available.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 15,
                    bottom: 5,
                    left: 5,
                  }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={95}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(55, 48, 163, 0.04)",
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #E4E7EF",
                      boxShadow:
                        "0 6px 20px rgba(15, 23, 42, 0.08)",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                  >
                    {statusChartData.map(
                      (entry, index) => (
                        <Cell
                          key={`status-${index}`}
                          fill={entry.color}
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <ChartCard
            title="Leads by Priority"
            subtitle="Current priority distribution"
          >
            {priorityChartData.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  No priority data available.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={priorityChartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(55, 48, 163, 0.04)",
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #E4E7EF",
                      boxShadow:
                        "0 6px 20px rgba(15, 23, 42, 0.08)",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    barSize={34}
                  >
                    {priorityChartData.map(
                      (entry, index) => (
                        <Cell
                          key={`priority-${index}`}
                          fill={entry.color}
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* =========================
          OVERDUE FOLLOW-UPS
      ========================== */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          borderColor:
            overdueCount > 0
              ? "rgba(185, 28, 28, 0.22)"
              : "divider",
        }}
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 2.5 },
            "&:last-child": {
              pb: { xs: 2, sm: 2.5 },
            },
          }}
        >
          <SectionHeader
            title="Overdue Follow-Ups"
            subtitle={
              overdueCount > 0
                ? "These follow-ups need your attention"
                : "You're all caught up"
            }
            count={overdueCount}
          />

          {overdueCount === 0 ? (
            <Box
              sx={{
                py: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 1,
              }}
            >
              <CheckCircleOutline
                sx={{
                  color: "success.main",
                }}
              />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Nothing is overdue right now.
              </Typography>
            </Box>
          ) : (
            <List
              disablePadding
              sx={{ mx: -1 }}
            >
              {data.overdueFollowUps.map(
                (followUp) => (
                  <ListItemButton
                    key={followUp.id}
                    onClick={() =>
                      navigate(
                        `/leads/${followUp.lead.id}`
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      px: 1,
                      py: 1.1,

                      "&:hover": {
                        bgcolor:
                          "rgba(185, 28, 28, 0.04)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "error.main",
                        mr: 1.5,
                        flexShrink: 0,
                      }}
                    />

                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={650}
                        >
                          {followUp.lead.leadCode} —{" "}
                          {followUp.lead.clientName}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          Due{" "}
                          {new Date(
                            followUp.dueAt
                          ).toLocaleString()}
                          {!isOwn &&
                            ` · Owner: ${followUp.owner.fullName}`}
                        </Typography>
                      }
                    />

                    <IconButton
                      size="small"
                      aria-label="Open lead"
                      tabIndex={-1}
                    >
                      <ArrowForwardOutlined
                        fontSize="small"
                      />
                    </IconButton>
                  </ListItemButton>
                )
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
