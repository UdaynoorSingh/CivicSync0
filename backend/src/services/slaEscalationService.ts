import cron from "node-cron";
import { Complaint } from "../models/Complaint";
import { ServiceRequest } from "../models/ServiceRequest"; // Add this import
import { Admin } from "../models/Admin";

export const startSLAEngine = () => {
  cron.schedule(process.env.SLA_CRON_SCHEDULE || "0 * * * *", async () => {
    console.log("⏱️ Running SLA Escalation Check...");

    try {
      // 1. Fetch breached complaints AND service requests
      const breachedComplaints = await Complaint.find({
        status: { $nin: ["resolved", "rejected"] },
        slaBreachTime: { $lte: new Date() }
      }).populate("assignedAdmin");

      const breachedServiceRequests = await ServiceRequest.find({
        status: { $nin: ["resolved", "rejected", "completed"] }, // Note: SRs have 'completed' instead of 'resolved'
        slaBreachTime: { $lte: new Date() }
      }).populate("assignedAdmin");

      // Combine both arrays into one queue
      const allBreachedTickets = [...breachedComplaints, ...breachedServiceRequests];

      for (const ticket of allBreachedTickets) {
        const currentAdmin = ticket.assignedAdmin as any;
        const nextTier = (currentAdmin?.tier || 1) + 1;

        // FIXED: Safe optional chaining for supervisor
        const nextAdmin = currentAdmin?.supervisor 
          ? await Admin.findById(currentAdmin.supervisor) 
          : await Admin.findOne({
              district: ticket.district,
              department: ticket.department,
              tier: nextTier,
              isActive: true
            });

        if (nextAdmin) {
          ticket.assignedAdmin = nextAdmin._id as any;
          ticket.escalationLevel = (ticket.escalationLevel || 0) + 1;
          ticket.status = "escalated";
          // Give the next tier 24 hours to resolve
          ticket.slaBreachTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 minute breach time for TESTING

          ticket.statusHistory.push({
            status: "escalated",
            note: `Automated Escalation: SLA breached. Ticket moved to Tier ${nextAdmin.tier} admin.`,
            timestamp: new Date()
          });

          await ticket.save();
          console.log(`🔼 Escalated Ticket ${ticket.referenceNumber} to Tier ${nextAdmin.tier}`);
        } else {
            // CEILING EFFECT FALLBACK: No higher admin exists.
            ticket.slaBreachTime = undefined as any; 
        
            ticket.statusHistory.push({
                status: ticket.status as any,
                note: `Automated Escalation Halted: SLA breached at Tier ${currentAdmin?.tier || 1}. No higher tier admin available. SLA timer cleared pending manual review.`,
                timestamp: new Date()
            });

            await ticket.save();
            console.log(`⚠️ Escalation Ceiling reached for ${ticket.referenceNumber}. Timer cleared.`);
        }
      }
    } catch (error) {
      console.error("❌ Error in SLA Escalation Engine:", error);
    }
  });
};