const twilio = require('twilio');
const moment = require('moment-timezone');

/**
 * reduces whitespace to a single space
 *
 * Note: This is useful for reducing the character length of a string
 * when es6 string templates are used.
 *
 * @param  {String} msg the message to normalize
 * @return {String} the msg with whitespace condensed to a single space
 */
function normalizeSpaces(msg) {
    return msg.replace(/\s\s+/g, ' ');
}

/**
 * Change FIRST LAST to First Last
 *
 * @param  {String} name name to manipulate
 * @return {String} propercased name
 */
function cleanupName(name) {
    return name.trim()
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * message to go to the site for more information
 *
 * @return {String} message.
 */
function forMoreInfo() {
    return normalizeSpaces(`OK. You can always go to ${process.env.COURT_PUBLIC_URL}
    for more information about your case and contact information.`);
}
/**
 * tell them of the court date, and ask them if they would like a reminder
 *
 * @param  {Boolean} includeSalutation true if we should greet them
 * @param  {string} name Name of cited person/defendant.
 * @param  {moment} datetime moment object containing date and time of court appearance.
 * @param  {string} room room of court appearance.
 * @return {String} message.
 */
function foundItAskForReminder(match) {
    const caseInfo = `We found a case for ${cleanupName(match.defendant)} scheduled
        ${(match.today ? 'today' : `on ${moment(match.date).format('ddd, MMM Do')}`)}
        at ${moment(match.date).format('h:mm A')}, at ${match.room}.`;

    let futureHearing = '';
    if (match.has_past) {
        futureHearing = ' a future hearing';
    } else if (match.today) { // Hearing today
        futureHearing = ' a future hearing';
    }

    return normalizeSpaces(`${caseInfo}
        Would you like a courtesy reminder the day before${futureHearing}? (reply YES or NO)`);
}

/**
 * tell them of the court date, and ask them if they would like a reminder
 *
 * @param  {Boolean} includeSalutation true if we should greet them
 * @param  {string} name Name of cited person/defendant.
 * @param  {moment} datetime moment object containing date and time of court appearance.
 * @param  {string} room room of court appearance.
 * @return {String} message.
 */
function foundItWillRemind(includeSalutation, match) {
    const salutation = `Hello from the ${process.env.COURT_NAME}. `;
    const caseInfo = `We found a case for ${cleanupName(match.defendant)} scheduled
        ${(match.today ? 'today' : `on ${moment(match.date).format('ddd, MMM Do')}`)}
        at ${moment(match.date).format('h:mm A')}, at ${match.room}.`;

    let futureHearing = '';
    if (match.has_past) {
        futureHearing = ' future hearings';
    } else if (match.today) { // Hearing today
        futureHearing = ' future hearings';
    }

    return normalizeSpaces(`${(includeSalutation ? salutation : '')}${caseInfo}
        We will send you courtesy reminders the day before${futureHearing}.`);
}

/**
 * greeting, who i am message
 *
 * @return {String} message.
 */
function iAmCourtBot() {
    return 'Hello, I am Courtbot. I have a heart of justice and a knowledge of court cases.';
}

/**
 * tell them their case number input was invalid
 *
 * @return {String} message.
 */
function invalidCaseNumber() {
    return normalizeSpaces(`Couldn't find your case. Case identifier should be 6 to 25
        numbers and/or letters in length.`);
}

/**
 * tell them we could not find it and ask if they want us to keep looking
 *
 * @return {String} message.
 */
function notFoundAskToKeepLooking() {
    return normalizeSpaces(`Could not find a case with that number. It can take
        several days for a case to appear in our system. Would you like us to keep
        checking for the next ${process.env.QUEUE_TTL_DAYS} days and text you if
        we find it? (reply YES or NO)`);
}

/**
 * Reminder message body
 *
 * @param  {Object} occurrence reminder record.
 * @return {string} message
 */
function reminder(occurrence) {
    return normalizeSpaces(`Reminder: It appears you have a court hearing tomorrow at
        ${moment(occurrence.date).format('h:mm A')} at ${occurrence.room}.
        You should confirm your hearing date and time by going to
        ${process.env.COURT_PUBLIC_URL}.
        - ${process.env.COURT_NAME}`);
}

/**
 * Message to send when we we cannot find a person's court case for too long.
 *
 * @return {string} Not Found Message
 */
function unableToFindCitationForTooLong(request) {
    return normalizeSpaces(`We haven't been able to find your court case ${request.case_id}.
        You can go to ${process.env.COURT_PUBLIC_URL} for more information.
        - ${process.env.COURT_NAME}`);
}

/**
 * tell them we will keep looking for the case they inquired about
 * @param {Array} cases
 * @return {string} message
 */
function weWillKeepLooking() {
    return normalizeSpaces(`OK. We will keep checking for up to ${process.env.QUEUE_TTL_DAYS} days.
        You can always go to ${process.env.COURT_PUBLIC_URL} for more information about
        your case and contact information.`);
}

/**
 * tell them we will try to remind them as requested
 *
 * @return {String} message.
 */
function weWillRemindYou() {
    return normalizeSpaces(`Sounds good. We will attempt to text you a courtesy reminder
        the day before your hearing date. Note that court schedules frequently change.
        You should always confirm your hearing date and time by going
        to ${process.env.COURT_PUBLIC_URL}.`);
}

/**
 * alerts user they are currently getting reminders for this case and gives option to stop
 * @param {Array} cases
 * @return {string} message
 */
function alreadySubscribed(case_id){
    return normalizeSpaces(`You are currently scheduled to receive reminders for this case.
    We will attempt to text you a courtesy reminder the day before your hearing date. To stop receiving reminders for this case text 'DELETE'.
    You can go to ${process.env.COURT_PUBLIC_URL} for more information.`);
}

/**
 * Sends a list of cases ids the user is currently subscribed to. Only sends cases where active = true
 * @param {Array} cases 
 */
function status(cases){
    let case_ids = cases.map(c => c.case_id).join(', ')
    return normalizeSpaces(`You are currently subscribed to receive notifications for the following cases:
    ${case_ids}`)
}
/**
 * tell them we will stop sending reminders about cases
 * @param {string} case_id
 * @return {string} message
 */
function weWillStopSending(case_id) {
    return normalizeSpaces(`OK. We will stop sending reminders for case: ${case_id}.
     If you want to resume reminders you can text this ID to us again.
    You can go to ${process.env.COURT_PUBLIC_URL} for more information.`);
}

/**
 * tell them we don't have any requests in the system for them
 *
 * @return {string} message.
 */
function youAreNotFollowingAnything(){
    return normalizeSpaces(`You are not currently subscribed for any reminders. If you want to be reminded
    about an upcoming hearing, send us the case/citation number. You can go to ${process.env.COURT_PUBLIC_URL} for more information.
    - ${process.env.COURT_NAME}`)
}

/**
 * Send a twilio message
 *
 * @param  {string} to   phone number message will be sent to
 * @param  {string} from who the message is being sent from
 * @param  {string} body message to be sent
 * @param  {function} function for resolving callback
 * @return {Promise} Promise to send message.
 */
function send(to, from, body) {
    const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    return client.messages.create({
        body: body,
        to: to,
        from: from
    })
}

module.exports = {
    forMoreInfo,
    foundItAskForReminder,
    foundItWillRemind,
    iAmCourtBot,
    invalidCaseNumber,
    notFoundAskToKeepLooking,
    weWillKeepLooking,
    weWillRemindYou,
    reminder,
    send,
    unableToFindCitationForTooLong,
    weWillStopSending,
    youAreNotFollowingAnything,
    alreadySubscribed,
    status
};
