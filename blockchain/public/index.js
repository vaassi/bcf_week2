$(function() {
  $('#bob').click(function() {
    var amount = $('#amount').val() || 0;
    var bob = $('#bob_wallet').text() || 0;
    if (amount > 0 && bob - amount >= 0) {
      $.ajax({
        type: 'POST',
        data: JSON.stringify({ from: 'Bob', to: 'Alice', amount: amount }),
        contentType: 'application/json',
        url: 'http://localhost:3000/tx',
        success: function(data) {
          alert('Transaction successfully created. Click "Mine" button.');
        },
        error: function(data) {
          alert('Something goes wrong');
        }
      });
    } else {
      alert('Bod does not have such amount of money or amount field is blank');
    }
  });

  $('#alice').click(function() {
    var amount = $('#amount').val() || 0;
    var alice = $('#alice_wallet').text() || 0;
    if (amount > 0 && alice - amount >= 0) {
      $.ajax({
        type: 'POST',
        data: JSON.stringify({ from: 'Alice', to: 'Bob', amount: amount }),
        contentType: 'application/json',
        url: 'http://localhost:3000/tx',
        success: function(data) {
          alert('Transaction successfully created. Click "Mine" button.');
        },
        error: function(data) {
          alert('Something goes wrong');
        }
      });
    } else {
      alert('Alice does not have such amount of money or amount field is blank');
    }
  });

  $('#mine').click(function() {
    $.get('/mine', function(data) {
      window.location.href = '/';
    });
  });
});
