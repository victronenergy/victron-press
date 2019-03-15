exports.header = {
    height: "2.5cm",
    contents: function() {
      return "<div style='font-size: 20px; font-family: Helvetica, sans-serif; color: #4790d0; text-align: center;'><span style='border-bottom: 1px solid #4790d0; padding-bottom: 0.3cm; font-weight: 700;'>Victron Energy</span></div>"
    }
  };

exports.footer = {
    height: "1.5cm",
    contents: function(pageNum, numPages) {
        return "<div style='font-family: Helvetica, sans-serif; font-weight: 400; font-size: 9px; text-align: right; padding-top: 1cm;'>" + pageNum + " / " + numPages + "</div>"
    }
};
