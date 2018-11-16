// Link types.
exports.types = {
  loopback   : 'loopback',    // Loopback.
  ethernet   : 'ether',       // Ethernet.
  pointopoint: 'ppp'          // Point to Point.
};

// Virtual link types.
exports.vl_types = {
  bond   : 'bond',     // Bond 
  bridge : 'bridge',   // Ethernet Bridge device.
  can    : 'can',      // Controller Area Network interface.
  dummy  : 'dummy',    // Dummy network interface.
  ifb    : 'ifb',      // Intermediate Functional Block device.
  ipoib  : 'ipoib',    // IP over Infiniband device.
  macvlan: 'macvlan',  // Virtual interface base on link layer address (MAC).
  tun    : 'tun',      // Tun
  vcan   : 'vcan',     // Virtual Local CAN interface.
  veth   : 'veth',     // Virtual ethernet interface.
  vlan   : 'vlan',     // 802.1q tagged virtual LAN interface.
  vxlan  : 'vxlan'     // Virtual eXtended LAN.
};

var vl_types = [
  'bridge', 'bond', 'can', 'dummy', 'ifb', 'ipoib',
  'macvlan', 'vcan', 'veth', 'vlan', 'vxlan', 'tun'
];
// Interface flags.
exports.flags = [
  'UP',
  'LOOPBACK',
  'BROADCAST',
  'POINTOPOINT',
  'MULTICAST',
  'PROMISC',
  'ALLMULTI',
  'NOARP',
  'DYNAMIC',
  'SLAVE',

  // Undocumented.
  'LOWER_UP',
  'NO-CARRIER',
  'M-DOWN'
];

exports.flag_statuses = {
  on : 'on',
  off: 'off'
};

// Interface statuses.
exports.statuses = {
  UP            : 'UP',               // Ready to pass packets (if admin status is changed to up, then operational status should change to up if the interface is ready to transmit and receive network traffic).
  DOWN          : 'DOWN',             // If admin status is down, then operational status should be down.
  UNKNOWN       : 'UNKNOWN',          // Status can not be determined for some reason.
  LOWERLAYERDOWN: 'LOWERLAYERDOWN',   // Down due to state of lower layer interface.
  NOTPRESENT    : 'NOTPRESENT',       // Some component is missing, typically hardware.
  TESTING       : 'TESTING',          // In test mode, no operational packets can be passed.
  DORMANT       : 'DORMANT'           // Interface is waiting for external actions.
};

function parse_link(raw_link) {
  var link_line_1   = raw_link.lines[0];
  var link_fields_1 = link_line_1.trim().split(/\s/g);

  var wasDeleted = link_fields_1[0] === 'Deleted';
  if (wasDeleted) {
    link_fields_1.shift();
  }

  var link_line_2   = raw_link.lines[1];
  var link_fields_2 = link_line_2.trim().split(/\s/g);

  var name = link_fields_1[1].split(':')[0];
  var link = {
    index  : link_fields_1[0].split(':')[0], // Don't needed since the array is ordered anyway but just in case.
    deleted: wasDeleted,
    name   : name,
    flags  : link_fields_1[2].slice(1, -1).split(','), // First remove the <,> chars.

    type: link_fields_2[0].split('\/')[1],

    mac: link_fields_2[1],
    brd: link_fields_2[3]
  };

  /*
   * Parses dynamically the following fields, if are there.
   *
   * mtu
   * qdisc
   * state
   * mode
   * qlen
   */
  var rest_line_fields = link_fields_1.slice(3);
  for (var i = 0, rest_line_length = rest_line_fields.length - 1;
       i < rest_line_length;
       i += 2 /* Each field is composed for two consecutive items. */) {

    link[rest_line_fields[i]] = rest_line_fields[i + 1];
  }

  /*
   * Parses and append the virtual link type, if any.
   */
  for (var i = 2; i < raw_link.lines.length; ++i) {
    var first_token = raw_link.lines[i].trim().split(/\s+/)[0];
    if (vl_types.indexOf(first_token) > -1) {
      link['vl_type'] = first_token;
    }
  }

  /*
   * Finally, add the parsed link to the output.
   */
  return link;
}

/**
 * Parses .show() output.
 *
 * @param raw_data
 * @returns {Array}
 */
exports.parse_links = function (raw_data) {
  if (!raw_data) {
    throw new Error('Invalid arguments.');
  }
  var raw_links = [];
  var last_raw_link = null;
  var raw_lines = raw_data.split('\n');

  for (var i = 0; i < raw_lines.length; ++i) {
    var line = raw_lines[i];
    if (/^\d+:/.test(line)) {
      if (last_raw_link != null) {
        raw_links.push(last_raw_link);
      }
      last_raw_link = {
        lines: [line]
      };
      continue;
    }
    if (last_raw_link != null) {
      last_raw_link.lines.push(line);
      continue;
    }
    throw new Error('Invalid iproute format');
  }

  if (last_raw_link != null) {
    raw_links.push(last_raw_link);
  }
  return raw_links.map(parse_link);
};
