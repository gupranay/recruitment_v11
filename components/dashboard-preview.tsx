// "use client"

// import { useState, useEffect } from "react"
// import { ChevronDown, ChevronRight, LogOut, Plus, Settings, Upload, X, Loader2 } from 'lucide-react'
// import Link from "next/link"

// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Separator } from "@/components/ui/separator"
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
// import { Badge } from "@/components/ui/badge"
// import { toast } from "react-hot-toast"

// function LoadingModal({ isOpen, message = "Loading..." }: { isOpen: boolean; message?: string }) {

//   return (
//     <Dialog open={isOpen}>
//       <DialogContent className="sm:max-w-[425px]">
//         <div className="flex flex-col items-center justify-center space-y-4 py-6">
//           <Loader2 className="h-10 w-10 animate-spin text-primary" />
//           <p className="text-center text-lg font-medium">{message}</p>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }

// interface Applicant {
//   id: string;
//   name: string;
//   status: string;
//   rejected: boolean;
// }

// interface ApplicantCardProps {
//   applicant: Applicant;
//   onMoveToNextRound: (id: string) => void;
//   onReject: (id: string) => void;
// }

// function ApplicantCard({ applicant, onMoveToNextRound, onReject }: ApplicantCardProps) {
//   const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
//   const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);

//   return (
//     <Card className={applicant.rejected ? "border-destructive" : ""}>
//       <CardHeader>
//         <CardTitle className="text-base flex items-center justify-between">
//           {applicant.name}
//           {applicant.rejected && (
//             <Badge variant="destructive">Rejected</Badge>
//           )}
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="aspect-[3/4] rounded-lg bg-muted" />
//       </CardContent>
//       <CardFooter className="flex justify-between">
//         <div className="text-sm text-muted-foreground">{applicant.status}</div>
//         <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
//           <AlertDialogTrigger asChild>
//             <Button
//               size="sm"
//               variant="outline"
//               className="gap-2"
//               onClick={() => setIsAlertDialogOpen(true)}
//             >
//               {applicant.rejected ? "Rejected" : "Move or Reject"}
//               <ChevronRight className="h-4 w-4" />
//             </Button>
//           </AlertDialogTrigger>
//           <AlertDialogContent>
//             <AlertDialogHeader>
//               <AlertDialogTitle>Confirm Action</AlertDialogTitle>
//               <AlertDialogDescription>
//                 Do you want to move {applicant.name} to the next round or reject them?
//               </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//               <AlertDialogCancel>Cancel</AlertDialogCancel>
//               {!applicant.rejected && (
//                 <AlertDialogAction
//                   onClick={() => {
//                     onMoveToNextRound(applicant.id)
//                     setIsAlertDialogOpen(false)
//                   }}
//                 >
//                   Move to Next Round
//                 </AlertDialogAction>
//               )}
//               {!applicant.rejected && (
//                 <AlertDialogAction
//                   onClick={() => {
//                     setShowRejectConfirmation(true)
//                     setIsAlertDialogOpen(false)
//                   }}
//                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
//                 >
//                   <X className="mr-2 h-4 w-4" />
//                   Reject Applicant
//                 </AlertDialogAction>
//               )}
//             </AlertDialogFooter>
//           </AlertDialogContent>
//         </AlertDialog>
//       </CardFooter>
//       <AlertDialog open={showRejectConfirmation} onOpenChange={setShowRejectConfirmation}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
//             <AlertDialogDescription>
//               Are you sure you want to reject {applicant.name}? This action cannot be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel onClick={() => setShowRejectConfirmation(false)}>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={() => {
//                 onReject(applicant.id)
//                 setShowRejectConfirmation(false)
//               }}
//               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
//             >
//               Confirm Rejection
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </Card>
//   )
// }

// function ApplicantGrid({ applicants, onMoveToNextRound, onReject }: { applicants: Applicant[]; onMoveToNextRound: (id: number) => void; onReject: (id: number) => void; }) {
//   return (
//     <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//       {applicants.map((applicant: Applicant) => (
//         <ApplicantCard
//           key={applicant.id}
//           applicant={applicant}
//           onMoveToNextRound={onMoveToNextRound}
//           onReject={onReject as (id: string) => void} // Type assertion to match expected type
//         />
//       ))}
//     </div>
//   )
// }

// export function DashboardPreview() {
//   const [currentOrg, setCurrentOrg] = useState({ id: 1, name: "V1" })
//   const [currentCycle, setCurrentCycle] = useState({ id: 1, name: "W24" })
//   const [rounds, setRounds] = useState(["Initial Applications", "First Interview", "Second Interview", "Final Decision"])
//   const [currentRound, setCurrentRound] = useState(0)
//   const [applicants, setApplicants] = useState([
//     { id: 1, name: "Applicant 1", status: "Pending Review", round: 0, rejected: false },
//     { id: 2, name: "Applicant 2", status: "Interviewed", round: 0, rejected: false },
//     { id: 3, name: "Applicant 3", status: "Pending Review", round: 0, rejected: false },
//     { id: 4, name: "Applicant 4", status: "Scheduled", round: 0, rejected: false },
//     { id: 5, name: "Applicant 5", status: "Interviewed", round: 0, rejected: false },
//     { id: 6, name: "Applicant 6", status: "Pending Review", round: 0, rejected: false },
//   ])
//   const [isLoading, setIsLoading] = useState(false)
//   const [loadingMessage, setLoadingMessage] = useState("")

//   const moveToNextRound = async (applicantId) => {
//     setIsLoading(true)
//     setLoadingMessage("Moving applicant to next round...")
//     await new Promise(resolve => setTimeout(resolve, 1000)) // Simulating API call
//     setApplicants(applicants.map(applicant =>
//       applicant.id === applicantId && applicant.round < rounds.length - 1
//         ? { ...applicant, round: applicant.round + 1, rejected: false }
//         : applicant
//     ))
//     setIsLoading(false)
//     toast({
//       title: "Applicant Moved",
//       description: `Applicant has been moved to ${rounds[currentRound + 1]}.`,
//     })
//   }

//   const rejectApplicant = async (applicantId) => {
//     setIsLoading(true)
//     setLoadingMessage("Rejecting applicant...")
//     await new Promise(resolve => setTimeout(resolve, 1000)) // Simulating API call
//     setApplicants(applicants.map(applicant =>
//       applicant.id === applicantId
//         ? { ...applicant, rejected: true }
//         : applicant
//     ))
//     setIsLoading(false)
//     toast({
//       title: "Applicant Rejected",
//       description: "The applicant has been marked as rejected.",
//       variant: "destructive",
//     })
//   }

//   const currentApplicants = applicants.filter(applicant => applicant.round === currentRound)

//   return (
//     <div className="flex h-screen flex-col">
//       <LoadingModal isOpen={isLoading} message={loadingMessage} />
//       <header className="flex h-14 items-center justify-between border-b bg-background px-6">
//         <Link href="#" className="font-semibold">
//           Recruitify
//         </Link>
//         <div className="flex items-center gap-4">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" size="sm">
//                 {currentOrg.name}
//                 <ChevronDown className="ml-2 h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuLabel>Select Organization</DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onSelect={() => setCurrentOrg({ id: 1, name: "V1" })}>V1</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => setCurrentOrg({ id: 2, name: "V2" })}>V2</DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem>
//                 <Plus className="mr-2 h-4 w-4" />
//                 Create Organization
//               </DropdownMenuItem>
//               <Dialog>
//                 <DialogTrigger asChild>
//                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
//                     <Settings className="mr-2 h-4 w-4" />
//                     Manage Organization
//                   </DropdownMenuItem>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Manage Organization</DialogTitle>
//                     <DialogDescription>Edit the details of your organization.</DialogDescription>
//                   </DialogHeader>
//                   <form onSubmit={(e) => e.preventDefault()}>
//                     <div className="grid gap-4 py-4">
//                       <div className="grid gap-2">
//                         <Label htmlFor="orgName">Organization Name</Label>
//                         <Input id="orgName" defaultValue={currentOrg.name} />
//                       </div>
//                     </div>
//                     <DialogFooter>
//                       <Button type="submit">Save Changes</Button>
//                     </DialogFooter>
//                   </form>
//                 </DialogContent>
//               </Dialog>
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" size="sm">
//                 {currentCycle.name}
//                 <ChevronDown className="ml-2 h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuLabel>Select Cycle</DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onSelect={() => setCurrentCycle({ id: 1, name: "W24" })}>W24</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => setCurrentCycle({ id: 2, name: "F24" })}>F24</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => setCurrentCycle({ id: 3, name: "F24 Build Night" })}>F24 Build Night</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => setCurrentCycle({ id: 4, name: "F24 Decisions" })}>F24 Decisions</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => setCurrentCycle({ id: 5, name: "W25" })}>W25</DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem>
//                 <Plus className="mr-2 h-4 w-4" />
//                 Create Recruitment Cycle
//               </DropdownMenuItem>
//               <Dialog>
//                 <DialogTrigger asChild>
//                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
//                     <Settings className="mr-2 h-4 w-4" />
//                     Manage Recruitment Cycle
//                   </DropdownMenuItem>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Manage Recruitment Cycle</DialogTitle>
//                     <DialogDescription>Edit the details of your recruitment cycle.</DialogDescription>
//                   </DialogHeader>
//                   <form onSubmit={(e) => e.preventDefault()}>
//                     <div className="grid gap-4 py-4">
//                       <div className="grid gap-2">
//                         <Label htmlFor="cycleName">Cycle Name</Label>
//                         <Input id="cycleName" defaultValue={currentCycle.name} />
//                       </div>
//                     </div>
//                     <DialogFooter>
//                       <Button type="submit">Save Changes</Button>
//                     </DialogFooter>
//                   </form>
//                 </DialogContent>
//               </Dialog>
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <Button variant="ghost" size="icon">
//             <LogOut className="h-4 w-4" />
//             <span className="sr-only">Logout</span>
//           </Button>
//         </div>
//       </header>
//       <div className="flex flex-1">
//         <aside className="w-64 border-r">
//           <div className="flex items-center justify-between p-4">
//             <div className="font-medium">Recruitment Rounds</div>
//             <Dialog>
//               <DialogTrigger asChild>
//                 <Button variant="ghost" size="icon">
//                   <Plus className="h-4 w-4" />
//                   <span className="sr-only">Create Round</span>
//                 </Button>
//               </DialogTrigger>
//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>Create New Round</DialogTitle>
//                   <DialogDescription>Add a new round to the recruitment process.</DialogDescription>
//                 </DialogHeader>
//                 <form onSubmit={(e) => e.preventDefault()}>
//                   <div className="grid gap-4 py-4">
//                     <div className="grid gap-2">
//                       <Label htmlFor="roundName">Round Name</Label>
//                       <Input id="roundName" name="roundName" placeholder="Enter round name" />
//                     </div>
//                   </div>
//                   <DialogFooter>
//                     <Button type="submit">Create Round</Button>
//                   </DialogFooter>
//                 </form>
//               </DialogContent>
//             </Dialog>
//           </div>
//           <Separator />
//           <ScrollArea className="h-[calc(100vh-8rem)]">
//             <div className="space-y-1 p-2">
//               {rounds.map((round, index) => (
//                 <Button
//                   key={round}
//                   variant={index === currentRound ? "secondary" : "ghost"}
//                   className="w-full justify-start"
//                   onClick={() => setCurrentRound(index)}
//                 >
//                   {round}
//                 </Button>
//               ))}
//             </div>
//           </ScrollArea>
//         </aside>
//         <main className="flex-1">
//           <div className="border-b">
//             <div className="flex h-14 items-center justify-between px-6">
//               <div className="font-medium">Current Round: {rounds[currentRound]}</div>
//               <Button size="sm" className="gap-2">
//                 <Upload className="h-4 w-4" />
//                 Upload Applicants
//               </Button>
//             </div>
//           </div>
//           <div className="p-6">
//             <ApplicantGrid
//               applicants={currentApplicants}
//               onMoveToNextRound={moveToNextRound}
//               onReject={rejectApplicant}
//             />
//           </div>
//         </main>
//       </div>
//     </div>
//   )
// }