(function() {
    var element;
    var sheet;
    var spreadsheet;
    var moduleOptions = {
        setup: function() {
            element = $("<div>").appendTo(QUnit.fixture);

            spreadsheet = new kendo.ui.Spreadsheet(element, { rows: 3, columns: 3 });

            sheet = spreadsheet.activeSheet();
        },
        teardown: function() {
            kendo.destroy(QUnit.fixture);
            QUnit.fixture.empty();
        }
    };

    module("spreadsheet dialogs", moduleOptions);

    test("opens formatCells dialog", function() {
        spreadsheet.openDialog("formatCells");

        equal($(".k-window").length, 1);
    });

    test("passes options to dialog", function() {
        var dialog = spreadsheet.openDialog("message", { text: "Foo" });

        equal(dialog.options.text, "Foo");
    });

    test("provides API for closing windows", function() {
        var dialog = spreadsheet.openDialog("message", { text: "Foo" });

        ok(dialog.close);
    });

    var viewModel;
    var usCurrencyInfo = kendo.cultures["en-US"].numberFormat.currency;
    var bgCurrencyInfo = kendo.cultures["bg-BG"].numberFormat.currency;
    var FormatCellsViewModel = kendo.spreadsheet.FormatCellsViewModel;

    module("SpreadSheet FormatCellsViewModel", {
        setup: function() {
            viewModel = new FormatCellsViewModel({
                value: 100,
                currencies: [],
                allFormats: {
                    numberFormats: [],
                    dateFormats: []
                }
            });
        }
    });

    test("preview of string value", function() {
        viewModel.set("value", "bar");

        equal(viewModel.preview(), "bar");
    });

    test("preview uses custom format", function() {
        viewModel.set("format", "foo");

        equal(viewModel.preview(), "foo");
    });

    test("preview uses date format", function() {
        viewModel.set("value", 0);
        viewModel.set("format", "mm-yy");

        equal(viewModel.preview(), "12-99");
    });

    test("showCurrencyFilter is false for single currency", function() {
        viewModel = new FormatCellsViewModel({
            value: 100,
            category: { type: "currency" },
            currencies: [
                { name: "Foo", value: usCurrencyInfo }
            ]
        });

        ok(!viewModel.showCurrencyFilter);
    });

    test("showCurrencyFilter is true for multiple currencies", function() {
        viewModel = new FormatCellsViewModel({
            value: 100,
            category: { type: "currency" },
            currencies: [
                { name: "Foo", value: usCurrencyInfo },
                { name: "Bar", value: bgCurrencyInfo }
            ]
        });

        ok(viewModel.showCurrencyFilter);
    });

    test("convert currency format", function() {
        var convert = FormatCellsViewModel.convert.currency;

        var prefixFoo = {
            abbr: "FOO",
            pattern: ["($n)", "$n"],
            decimals: 2,
            ",": ";",
            ".": "_",
            groupSize: [3],
            symbol: "f"
        };

        equal(convert({ currency: prefixFoo, decimals: true, iso: true  }), '"FOO" ?_00');
        equal(convert({ currency: prefixFoo, iso: true  }), '"FOO" ?');
        equal(convert({ currency: prefixFoo, decimals: true }), 'f?_00');
        equal(convert({ currency: prefixFoo, decimals: false }), 'f?');


        var suffixFoo = kendo.deepExtend({}, prefixFoo);
        suffixFoo.pattern[1] = "n$";

        equal(convert({ currency: suffixFoo, decimals: true, iso: true  }), '"FOO" ?_00');
        equal(convert({ currency: suffixFoo, iso: true  }), '"FOO" ?');
        equal(convert({ currency: prefixFoo, decimals: true }), '?_00f');
        equal(convert({ currency: prefixFoo, decimals: false }), '?f');
    });

    test("convert date format", function() {
        var convert = FormatCellsViewModel.convert.date;

        equal(convert("MMMM dd, yyyy"), "mmmm dd, yyyy");
        equal(convert("h:mm tt"), "h:mm AM/PM");
        equal(convert("h:mm tt Z"), "");
        equal(convert("ddTHH"), "");
        equal(convert("'-'hh"), '"-"hh');
    });

    module("FormatCellsDialog", {
        setup: function() {
            moduleOptions.setup();

            dialog = spreadsheet.openDialog("formatCells");
        },
        teardown: moduleOptions.teardown
    });

    test("apply executes PropertyChangeCommand", 3, function() {
        var formats = dialog.viewModel.formats;
        var format = formats[formats.length-1].value;

        dialog.one("execute", function(e) {
            ok(e.command instanceof kendo.spreadsheet.PropertyChangeCommand);
            equal(e.command.options.property, "format");
            equal(e.command.options.value, format);
        });

        dialog.viewModel.set("format", format);

        dialog.apply();
    });

    test("close does not execute command", 0, function() {
        dialog.one("execute", function(e) {
            ok(false);
        });

        dialog.close();
    });

    var list;

    module("FontFamiltyDialog", {
        setup: function() {
            moduleOptions.setup();

            dialog = spreadsheet.openDialog("fontFamily", { fonts: ["foo", "bar"], defaultFont: "foo" });
            list = dialog.dialog().wrapper.find("[data-role=staticlist]").data("kendoStaticList");
        },
        teardown: moduleOptions.teardown
    });

    test("initializes list with fonts", function() {
        ok(list.dataSource.data().length);
        ok(list.items().length);
    });

    test("has default value", function() {
        ok(list.value().length);
    });

    test("list change event triggers PropertyChangeCommand", 3, function() {
        dialog.one("execute", function(e) {
            ok(e.command instanceof kendo.spreadsheet.PropertyChangeCommand);
            equal(e.command.options.property, "fontFamily");
            equal(e.command.options.value, "bar");
        });

        list.value(["bar"]);
        list.trigger("change");
    });

    test("close does not execute command", 0, function() {
        dialog.one("execute", function(e) {
            ok(false);
        });

        dialog.close();
    });

    var list;

    module("FontSizeDialog", {
        setup: function() {
            moduleOptions.setup();

            dialog = spreadsheet.openDialog("fontSize", { sizes: [11, 12, 13], defaultFont: 12 });
            list = dialog.dialog().wrapper.find("[data-role=staticlist]").data("kendoStaticList");
        },
        teardown: moduleOptions.teardown
    });

    test("initializes list with sizes", function() {
        equal(list.dataSource.data().length, 3);
        equal(list.items().length, 3);
    });

    test("has default value", function() {
        ok(list.value().length);
    });

    test("list change event triggers PropertyChangeCommand", 3, function() {
        dialog.one("execute", function(e) {
            ok(e.command instanceof kendo.spreadsheet.PropertyChangeCommand);
            equal(e.command.options.property, "fontSize");
            equal(e.command.options.value, "11px");
        });

        list.value([11]);
        list.trigger("change");
    });

    test("close does not execute command", 0, function() {
        dialog.one("execute", function(e) {
            ok(false);
        });

        dialog.close();
    });

})();
